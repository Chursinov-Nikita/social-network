"use client";

import Avatar from "@/app/components/ui/Avatar";
import { ConfirmDialog } from "@/app/components/ui/Dialog";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import { PAGE_SIZE, type GroupChat, type Message } from "@/app/types/chat";
import {
  ChevronLeft,
  EllipsisVertical,
  LogOut,
  MicIcon,
  SendHorizontal,
  Square,
  Trash2,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Fragment, useEffect, useRef, useState } from "react";
import Bubble, { DayChip, getRunInfo } from "./Bubble";
import EmojiPicker from "./EmojiPicker";
import { mergeLatestPage } from "./mergeLatestPage";

const POLL_INTERVAL_MS = 5000;
const MAX_RECORDING_SEC = 120;

const GroupChatWindow = ({
  groupId,
  groupName,
  groupAvatar,
  onLeave,
  onBack,
}: {
  groupId: string;
  groupName: string;
  groupAvatar: string | null;
  onLeave: () => void;
  onBack?: () => void;
}) => {
  const { data: session } = useSession();
  const { lang } = useLang();
  const tr = t[lang];
  const currentUserId = session?.user?.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [pendingDeleteMsgId, setPendingDeleteMsgId] = useState<string | null>(
    null,
  );
  const [deletingMsg, setDeletingMsg] = useState(false);
  const [group, setGroup] = useState<GroupChat | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    const url = `/api/groups/${groupId}/messages`;

    fetch(`/api/groups/${groupId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setGroup(data));

    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Message[]) => {
        setMessages(data);
        setHasMore(data.length === PAGE_SIZE);
      });

    fetch(`/api/groups/${groupId}/messages/read`, { method: "PATCH" });

    const interval = setInterval(async () => {
      const res = await fetch(url);
      if (!res.ok) return;
      const latest: Message[] = await res.json();
      setMessages((prev) => mergeLatestPage(prev, latest));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [groupId, currentUserId]);

  useEffect(() => {
    const lastId = messages.at(-1)?.id ?? null;
    if (lastId === lastMessageIdRef.current) return;
    lastMessageIdRef.current = lastId;
    const c = containerRef.current;
    if (c) c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  useEffect(() => {
    if (!isRecording) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        stopRecording();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isRecording]);

  const loadOlder = async () => {
    if (!hasMore || loadingOlder || !messages.length) return;
    setLoadingOlder(true);
    const cursor = messages[0].createdAt;
    const res = await fetch(`/api/groups/${groupId}/messages?cursor=${cursor}`);
    const older: Message[] = await res.json();
    setMessages((prev) => [...older, ...prev]);
    setHasMore(older.length === PAGE_SIZE);
    setLoadingOlder(false);
  };

  const sendMessage = async () => {
    if (!content.trim() || !currentUserId) return;
    const plainText = content.trim();
    setContent("");

    const optimistic: Message = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      receiverId: null,
      groupId,
      content: plainText,
      type: "text",
      read: false,
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: plainText, type: "text" }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const saved: Message = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? saved : m)),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setContent(plainText);
    }
  };

  const confirmDeleteMessage = async () => {
    if (!pendingDeleteMsgId) return;
    setDeletingMsg(true);
    await fetch(`/api/chat/messages/${pendingDeleteMsgId}`, {
      method: "DELETE",
    });
    setMessages((prev) => prev.filter((m) => m.id !== pendingDeleteMsgId));
    setPendingDeleteMsgId(null);
    setDeletingMsg(false);
  };

  const formatRecordingTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        await sendAudioMessage(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      let sec = 0;
      recordingTimerRef.current = setInterval(() => {
        sec++;
        setRecordingTime(sec);
        if (sec >= MAX_RECORDING_SEC) stopRecording();
      }, 1000);
    } catch {
      // Microphone permission denied or unavailable — recording simply doesn't start.
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingTime(0);
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  const sendAudioMessage = async (blob: Blob) => {
    if (!currentUserId) return;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const tempUrl = URL.createObjectURL(blob);
    const optimistic: Message = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      receiverId: null,
      groupId,
      content: tempUrl,
      type: "audio",
      read: false,
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: base64, type: "audio" }),
      });
      if (!res.ok) throw new Error("Failed to send voice message");
      const saved: Message = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? saved : m)),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      URL.revokeObjectURL(tempUrl);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="relative z-20 flex h-14 shrink-0 items-center gap-1 border-b border-line bg-panel px-2 md:px-4">
        {onBack && (
          <button
            onClick={onBack}
            aria-label={tr.back}
            className="icon-btn md:hidden"
          >
            <ChevronLeft className="size-6" strokeWidth={1.75} />
          </button>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={groupName} image={groupAvatar} size={40} group />
          <div className="min-w-0">
            <p className="truncate text-base font-medium">{groupName}</p>
            <p className="truncate text-xs text-muted">
              {tr.membersCount(group?.members?.length ?? 0)}
            </p>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((p) => !p)}
            aria-label={tr.moreActions}
            aria-expanded={showMenu}
            className="icon-btn"
          >
            <EllipsisVertical className="size-5" strokeWidth={1.75} />
          </button>
          {showMenu && (
            <div className="menu absolute top-11 right-0">
              <button
                className="menu-item"
                onClick={async () => {
                  await fetch(`/api/groups/${groupId}/members`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: currentUserId }),
                  });
                  setShowMenu(false);
                  onLeave();
                }}
              >
                <LogOut className="size-4" />
                {tr.leaveGroup}
              </button>

              {group?.createdBy === currentUserId && (
                <button
                  className="menu-item menu-item-danger"
                  onClick={async () => {
                    await fetch(`/api/groups/${groupId}`, {
                      method: "DELETE",
                    });
                    setShowMenu(false);
                    onLeave();
                  }}
                >
                  <Trash2 className="size-4" />
                  {tr.deleteGroup}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div
        ref={containerRef}
        className="thin-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col px-3 py-3 md:px-6">
          {hasMore && (
            <button
              onClick={loadOlder}
              disabled={loadingOlder}
              className="btn btn-secondary mb-2 h-8 self-center text-xs"
            >
              {loadingOlder ? tr.loading : tr.loadOlderMessages}
            </button>
          )}

          {messages.map((msg, index) => {
            const isMe = msg.senderId === currentUserId;
            const isAudio = msg.type === "audio";
            const senderName = msg.sender?.name ?? "";
            const time = new Date(msg.createdAt).toLocaleTimeString(lang, {
              hour: "2-digit",
              minute: "2-digit",
            });
            const { startsDay, startsRun, endsRun } = getRunInfo(
              messages,
              index,
            );

            return (
              <Fragment key={msg.id}>
                {startsDay && <DayChip date={msg.createdAt} lang={lang} />}
                <div
                  className={`flex ${isMe ? "justify-end" : "justify-start"} ${startsRun ? "mt-2" : "mt-0.5"}`}
                  onMouseEnter={() => setHoveredMsg(msg.id)}
                  onMouseLeave={() => setHoveredMsg(null)}
                >
                  <div className="flex max-w-[85%] items-end gap-1 md:max-w-[75%]">
                    {isMe && hoveredMsg === msg.id && (
                      <button
                        onClick={() => setPendingDeleteMsgId(msg.id)}
                        aria-label={tr.deleteThisMessage}
                        className="icon-btn size-7 bg-panel hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                    <Bubble
                      isMe={isMe}
                      tail={endsRun}
                      time={time}
                      text={isAudio ? undefined : msg.content}
                      className={isAudio ? "pb-6" : ""}
                    >
                      {!isMe && startsRun && (
                        <p className="text-sm font-medium">{senderName}</p>
                      )}
                      {isAudio && (
                        <audio
                          controls
                          src={msg.content}
                          className="h-10 max-w-full"
                        />
                      )}
                    </Bubble>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:pb-4">
        <div className="mx-auto max-w-3xl">
          {isRecording ? (
            <div className="flex h-11 items-center gap-3 rounded-2xl bg-panel pr-1 pl-4">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-danger" />
              <span className="flex-1 text-base tabular-nums">
                {formatRecordingTime(recordingTime)}
              </span>
              <button
                onClick={cancelRecording}
                aria-label={tr.cancelRecording}
                className="icon-btn size-9 hover:text-danger"
              >
                <XCircle className="size-5" strokeWidth={1.75} />
              </button>
              <button
                onClick={stopRecording}
                aria-label={tr.stopRecording}
                className="btn btn-primary size-9 shrink-0 px-0"
              >
                <Square className="size-3.5 fill-current" />
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex min-w-0 flex-1 items-end rounded-2xl bg-panel">
                <EmojiPicker
                  onPick={(emoji) => setContent((prev) => prev + emoji)}
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (isRecording) stopRecording();
                      else void sendMessage();
                    }
                  }}
                  placeholder={tr.writeMessage}
                  aria-label={tr.writeMessage}
                  rows={1}
                  className="thin-scroll field-sizing-content max-h-40 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-[11px] pr-3 text-base outline-none placeholder:text-faint"
                />
              </div>

              {content.trim() ? (
                <button
                  onClick={() => void sendMessage()}
                  aria-label={tr.send}
                  className="btn btn-primary size-11 shrink-0 px-0"
                >
                  <SendHorizontal className="size-5" />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  aria-label={tr.recordVoice}
                  className="icon-btn size-11 bg-panel"
                >
                  <MicIcon className="size-5" strokeWidth={1.75} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {pendingDeleteMsgId && (
        <ConfirmDialog
          title={tr.deleteThisMessage}
          description={tr.deleteThisMessageDesc}
          confirmLabel={tr.delete}
          cancelLabel={tr.cancel}
          pendingLabel={tr.deleting}
          pending={deletingMsg}
          onConfirm={confirmDeleteMessage}
          onCancel={() => setPendingDeleteMsgId(null)}
        />
      )}
    </div>
  );
};

export default GroupChatWindow;
