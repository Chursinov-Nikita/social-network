"use client";

import Avatar from "@/app/components/ui/Avatar";
import { ConfirmDialog } from "@/app/components/ui/Dialog";
import { useLang } from "@/app/context/language";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import { t } from "@/app/translation/translation";
import {
  PAGE_SIZE,
  type ChatUser,
  type DeleteMode,
  type Message,
} from "@/app/types/chat";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  EllipsisVertical,
  PinIcon,
  Search,
  SendHorizontal,
  Trash2,
  UserCircle,
  X,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Bubble, { DayChip, getRunInfo } from "./Bubble";
import EmojiPicker from "./EmojiPicker";
import { mergeLatestPage } from "./mergeLatestPage";

const POLL_INTERVAL_MS = 5000;

const useClickOutside = (
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled: boolean,
) => {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [enabled, ref, onClose]);
};

const ChatWindow = ({
  recipient,
  onChatDeleted,
  onBack,
}: {
  recipient: ChatUser;
  onChatDeleted?: () => void;
  onBack?: () => void;
}) => {
  const { data: session } = useSession();
  const { lang } = useLang();
  const tr = t[lang];
  const currentUserId = session?.user?.id;
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [content, setContent] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInputMenu, setShowInputMenu] = useState(false);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>(null);
  const [deleting, setDeleting] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [pendingDeleteMsgId, setPendingDeleteMsgId] = useState<string | null>(
    null,
  );
  const [deletingMsg, setDeletingMsg] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const { onlineUsers, lastSeen } = useOnlineStatus([recipient.id]);
  const isOnline = onlineUsers.has(recipient.id);

  const closeSearch = () => {
    setShowInputMenu(false);
    setSearchQuery("");
    setCurrentSearchIndex(0);
  };

  useClickOutside(menuRef, () => setShowMenu(false), showMenu);
  useClickOutside(inputMenuRef, closeSearch, showInputMenu);

  useEffect(() => {
    if (!currentUserId) return;
    const url = `/api/chat/messages?recipientId=${recipient.id}`;

    fetch(url)
      .then((r) => r.json())
      .then((data: Message[]) => {
        setMessages(data);
        setHasMore(data.length === PAGE_SIZE);
      });
    fetch("/api/chat/messages/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: recipient.id }),
    });

    const interval = setInterval(async () => {
      const res = await fetch(url);
      if (!res.ok) return;
      const latest: Message[] = await res.json();
      setMessages((prev) => mergeLatestPage(prev, latest));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [recipient.id, currentUserId]);

  // Auto-scroll only when a new message arrives, not on every poll or when older history loads.
  useEffect(() => {
    const lastId = messages.at(-1)?.id ?? null;
    if (lastId === lastMessageIdRef.current) return;
    lastMessageIdRef.current = lastId;
    const c = containerRef.current;
    if (c) c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return messages
      .filter((m) => m.type === "text" && m.content.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [searchQuery, messages]);

  useEffect(() => {
    const id = searchResults[currentSearchIndex];
    if (!id) return;
    document
      .getElementById(`msg-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentSearchIndex, searchResults]);

  const goToPrevResult = () =>
    setCurrentSearchIndex(
      (i) => (i - 1 + searchResults.length) % searchResults.length,
    );

  const goToNextResult = () =>
    setCurrentSearchIndex((i) => (i + 1) % searchResults.length);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark>{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const loadOlder = async () => {
    if (!messages.length || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    const cursor = messages[0].createdAt;
    const res = await fetch(
      `/api/chat/messages?recipientId=${recipient.id}&cursor=${cursor}`,
    );
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
      receiverId: recipient.id,
      content: plainText,
      type: "text",
      read: false,
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: recipient.id,
          content: plainText,
        }),
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

  useEffect(() => {
    if (showInputMenu) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [showInputMenu]);

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

  const confirmDelete = async () => {
    if (!deleteMode || !currentUserId) return;
    setDeleting(true);
    if (deleteMode === "chat") {
      await fetch("/api/chat/clear", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: recipient.id, mode: "all" }),
      });
      setDeleteMode(null);
      setDeleting(false);
      onChatDeleted?.();
      return;
    }
    await fetch("/api/chat/clear", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: recipient.id, mode: deleteMode }),
    });
    setMessages([]);
    setDeleteMode(null);
    setDeleting(false);
  };

  const formatLastSeen = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return tr.wasOnlineNow;
    if (diffMin < 60) return tr.wasOnlineMins(diffMin);
    const timeStr = date.toLocaleTimeString(lang, {
      hour: "2-digit",
      minute: "2-digit",
    });
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    if (dateOnly.getTime() === today.getTime())
      return tr.wasOnlineToday(timeStr);
    if (dateOnly.getTime() === yesterday.getTime())
      return tr.wasOnlineYesterday(timeStr);
    return tr.wasOnlineDate(
      date.toLocaleDateString(lang, { day: "numeric", month: "long" }),
      timeStr,
    );
  };

  const statusText = isOnline
    ? tr.online
    : lastSeen[recipient.id]
      ? formatLastSeen(lastSeen[recipient.id])
      : tr.offline;

  const deleteModalTitles: Record<NonNullable<DeleteMode>, string> = {
    mine: tr.deleteMyMessages,
    all: tr.deleteAllMessages,
    chat: tr.deleteChat,
  };

  const deleteModalDescs: Record<NonNullable<DeleteMode>, string> = {
    mine: tr.deleteMineDesc,
    all: tr.deleteAllDesc,
    chat: tr.deleteChatDesc,
  };

  const pinned = messages.filter((m) => m.pinned);

  const scrollToPinned = (id: string) => {
    document
      .getElementById(`msg-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMsgId(id);
    setTimeout(() => setHighlightedMsgId(null), 1500);
  };

  const handlePinnedPanelClick = () => {
    if (!pinned.length) return;
    const target = pinned[pinnedIndex];
    scrollToPinned(target.id);
    setPinnedIndex((i) => (i + 1) % pinned.length);
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

        <button
          onClick={() => router.push(`/profile/${recipient.id}`)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        >
          <Avatar
            name={recipient.name}
            image={recipient.image}
            size={40}
            online={isOnline}
          />
          <span className="min-w-0">
            <span className="block truncate text-base font-medium">
              {recipient.name}
            </span>
            <span
              className={`block truncate text-xs ${isOnline ? "text-ink" : "text-muted"}`}
            >
              {statusText}
            </span>
          </span>
        </button>

        <button
          onClick={() => setShowInputMenu(true)}
          aria-label={tr.search}
          className="icon-btn"
        >
          <Search className="size-5" strokeWidth={1.75} />
        </button>

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
                onClick={() => {
                  router.push(`/profile/${recipient.id}`);
                  setShowMenu(false);
                }}
              >
                <UserCircle className="size-4" />
                {tr.goToProfile}
              </button>
              <button
                onClick={() => {
                  setDeleteMode("mine");
                  setShowMenu(false);
                }}
                className="menu-item"
              >
                <Trash2 className="size-4" />
                {deleteModalTitles.mine}
              </button>
              <button
                onClick={() => {
                  setDeleteMode("all");
                  setShowMenu(false);
                }}
                className="menu-item menu-item-danger"
              >
                <Trash2 className="size-4" />
                {deleteModalTitles.all}
              </button>
              <button
                onClick={() => {
                  setDeleteMode("chat");
                  setShowMenu(false);
                }}
                className="menu-item menu-item-danger"
              >
                <XCircle className="size-4" />
                {deleteModalTitles.chat}
              </button>
            </div>
          )}
        </div>

        {showInputMenu && (
          <div
            ref={inputMenuRef}
            className="absolute inset-0 z-10 flex items-center gap-1 bg-panel px-2 md:px-4"
          >
            <button
              onClick={closeSearch}
              aria-label={tr.closeSearch}
              className="icon-btn"
            >
              <X className="size-5" strokeWidth={1.75} />
            </button>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentSearchIndex(0);
              }}
              placeholder={tr.search}
              aria-label={tr.search}
              className="field h-10 min-w-0 flex-1 rounded-full"
            />
            {searchResults.length > 0 && (
              <>
                <span className="px-1 text-sm whitespace-nowrap text-muted tabular-nums">
                  {currentSearchIndex + 1}/{searchResults.length}
                </span>
                <button
                  onClick={goToPrevResult}
                  aria-label={tr.previousResult}
                  className="icon-btn"
                >
                  <ChevronUp className="size-5" strokeWidth={1.75} />
                </button>
                <button
                  onClick={goToNextResult}
                  aria-label={tr.nextResult}
                  className="icon-btn"
                >
                  <ChevronDown className="size-5" strokeWidth={1.75} />
                </button>
              </>
            )}
            {searchQuery.trim() && searchResults.length === 0 && (
              <span className="px-2 text-sm whitespace-nowrap text-muted">
                {tr.nothingFound}
              </span>
            )}
          </div>
        )}
      </header>

      {pinned.length > 0 && (
        <button
          onClick={handlePinnedPanelClick}
          className="flex h-12 w-full shrink-0 cursor-pointer items-center gap-3 border-b border-line bg-panel px-4 text-left transition-colors hover:bg-raised"
        >
          <span aria-hidden="true" className="h-8 w-0.5 rounded-full bg-ink" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium">{tr.pinned}</span>
            <span className="block truncate text-sm text-muted">
              {pinned[pinnedIndex % pinned.length].content}
            </span>
          </span>
          {pinned.length > 1 && (
            <span className="text-xs text-muted tabular-nums">
              {(pinnedIndex % pinned.length) + 1}/{pinned.length}
            </span>
          )}
          <PinIcon className="size-4 shrink-0 text-muted" />
        </button>
      )}

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
            const isCurrent = searchResults[currentSearchIndex] === msg.id;
            const isMatch = searchResults.includes(msg.id);
            const isHighlighted = highlightedMsgId === msg.id;
            const { startsDay, startsRun, endsRun } = getRunInfo(
              messages,
              index,
            );

            return (
              <Fragment key={msg.id}>
                {startsDay && <DayChip date={msg.createdAt} lang={lang} />}
                <div
                  id={`msg-${msg.id}`}
                  className={`flex ${isMe ? "justify-end" : "justify-start"} ${startsRun ? "mt-2" : "mt-0.5"}`}
                  onMouseEnter={() => setHoveredMsg(msg.id)}
                  onMouseLeave={() => setHoveredMsg(null)}
                >
                  <div className="flex max-w-[85%] items-end gap-1 md:max-w-[75%]">
                    {hoveredMsg === msg.id && (
                      <div
                        className={`flex shrink-0 gap-1 ${isMe ? "" : "order-last"}`}
                      >
                        {isMe && (
                          <button
                            onClick={() => setPendingDeleteMsgId(msg.id)}
                            aria-label={tr.deleteThisMessage}
                            className="icon-btn size-7 bg-panel hover:text-danger"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            await fetch(`/api/chat/messages/${msg.id}/pin`, {
                              method: "PATCH",
                            });
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === msg.id
                                  ? { ...m, pinned: !m.pinned }
                                  : m,
                              ),
                            );
                          }}
                          aria-label={tr.pinMessage}
                          aria-pressed={msg.pinned}
                          className={`icon-btn size-7 bg-panel ${msg.pinned ? "text-ink" : ""}`}
                        >
                          <PinIcon
                            className={`size-3.5 ${msg.pinned ? "fill-current" : ""}`}
                          />
                        </button>
                      </div>
                    )}
                    <Bubble
                      isMe={isMe}
                      tail={endsRun}
                      time={new Date(msg.createdAt).toLocaleTimeString(lang, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      text={
                        isMatch
                          ? highlightText(msg.content, searchQuery)
                          : msg.content
                      }
                      className={`${isCurrent ? "ring-2 ring-line-strong" : ""} ${isHighlighted ? "ring-2 ring-ink" : ""}`}
                    />
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:pb-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
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
                  void sendMessage();
                }
              }}
              placeholder={tr.writeMessage}
              aria-label={tr.writeMessage}
              rows={1}
              className="thin-scroll field-sizing-content max-h-40 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-[11px] pr-3 text-base outline-none placeholder:text-faint"
            />
          </div>

          <button
            onClick={() => void sendMessage()}
            disabled={!content.trim()}
            aria-label={tr.send}
            className="btn btn-primary size-11 shrink-0 px-0"
          >
            <SendHorizontal className="size-5" />
          </button>
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

      {deleteMode && (
        <ConfirmDialog
          title={deleteModalTitles[deleteMode]}
          description={deleteModalDescs[deleteMode]}
          confirmLabel={tr.delete}
          cancelLabel={tr.cancel}
          pendingLabel={tr.deleting}
          pending={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteMode(null)}
        />
      )}
    </div>
  );
};

export default ChatWindow;
