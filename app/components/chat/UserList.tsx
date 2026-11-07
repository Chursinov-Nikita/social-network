"use client";

import Avatar from "@/app/components/ui/Avatar";
import { EmptyText, RowSkeletons } from "@/app/components/ui/States";
import { useLang } from "@/app/context/language";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import { t } from "@/app/translation/translation";
import type {
  ChatUser,
  Folder,
  GroupChat,
  MessagePreview,
} from "@/app/types/chat";
import {
  Check,
  Loader2,
  Plus,
  Search,
  SquarePen,
  Users,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import CreateGroupModal from "./CreateGroupModal";
import CreateFolderModal from "./CreateFolderModal";

const POLL_INTERVAL_MS = 5000;
const ROW_CLASS =
  "flex h-[72px] w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 transition-colors duration-150 select-none";

type UserListProps = {
  onSelect: (user: ChatUser) => void;
  selected: ChatUser | null;
};

const UserList = ({ onSelect, selected }: UserListProps) => {
  const { data: session } = useSession();
  const { lang } = useLang();
  const tr = t[lang];

  const [users, setUsers] = useState<ChatUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [previews, setPreviews] = useState<Record<string, MessagePreview>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderMenuUser, setFolderMenuUser] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [deletingFolder, setDeletingFolder] = useState<string | null>(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(
    null,
  );
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const userIds = users.map((u) => u.id);
  const { onlineUsers } = useOnlineStatus(userIds);

  useEffect(() => {
    if (!session?.user?.id) return;

    const refresh = () => {
      fetch("/api/chat/previews")
        .then((r) => r.json())
        .then((data) => {
          setPreviews(data.previews ?? {});
          setUnread(data.unread ?? {});
        });
      fetch("/api/groups")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setGroups(Array.isArray(data) ? data : []));
    };

    fetch("/api/chat/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setUsersLoaded(true));
    fetch("/api/chat/folders")
      .then((r) => r.json())
      .then(setFolders);
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!folderMenuUser) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setFolderMenuUser(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [folderMenuUser]);

  const createFolder = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const res = await fetch("/api/chat/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const folder = await res.json();
    setFolders((prev) => [...prev, folder]);
    setIsCreatingFolder(false);
  };

  const deleteFolder = async (id: string) => {
    setDeletingFolder(id);
    await fetch(`/api/chat/folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (activeFolder === id) setActiveFolder("all");
    setDeletingFolder(null);
  };

  const toggleMember = async (folderId: string, companionId: string) => {
    const res = await fetch(`/api/chat/folders/${folderId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companionId }),
    });
    const data = await res.json();
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folderId) return f;
        return {
          ...f,
          members: data.added
            ? [...f.members, { companionId }]
            : f.members.filter((m) => m.companionId !== companionId),
        };
      }),
    );
  };

  const isInFolder = (folderId: string, userId: string) =>
    folders
      .find((f) => f.id === folderId)
      ?.members.some((m) => m.companionId === userId) ?? false;

  const q = searchQuery.trim().toLowerCase();

  const sortedUsers = [...users].sort((a, b) => {
    const aTime = previews[a.id]?.createdAt ?? "";
    const bTime = previews[b.id]?.createdAt ?? "";
    return bTime.localeCompare(aTime);
  });

  const folderFiltered =
    activeFolder === "all"
      ? sortedUsers
      : activeFolder === "unread"
        ? sortedUsers.filter((u) => (unread[u.id] ?? 0) > 0)
        : sortedUsers.filter((u) =>
            folders
              .find((f) => f.id === activeFolder)
              ?.members.some((m) => m.companionId === u.id),
          );

  const filteredUsers = q
    ? folderFiltered.filter((u) => {
        const nameMatch = (u.name ?? "").toLowerCase().includes(q);
        const preview = previews[u.id];
        const msgMatch =
          preview?.type === "text" && preview.content.toLowerCase().includes(q);
        return nameMatch || msgMatch;
      })
    : folderFiltered;

  const filteredGroups = q
    ? groups.filter((g) => g.name.toLowerCase().includes(q))
    : groups;

  const dmItems = filteredUsers.map((u) => ({
    type: "dm" as const,
    u,
    time: previews[u.id]?.createdAt ?? "",
  }));

  const groupItems = filteredGroups.map((g) => ({
    type: "group" as const,
    g,
    time: g.messages?.[0]?.createdAt ?? g.createdAt,
  }));

  const allItems = [...dmItems, ...groupItems].sort((a, b) =>
    b.time.localeCompare(a.time),
  );

  const totalUnread = Object.values(unread).reduce((s, n) => s + n, 0);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString(lang, { day: "numeric", month: "short" });
  };

  const formatPreview = (userId: string) => {
    const preview = previews[userId];
    if (!preview) return tr.clickToChat;
    if (preview.type === "audio") return tr.voiceMessage;
    return preview.content;
  };

  const formatGroupPreview = (g: GroupChat) => {
    const lastMsg = g.messages?.[0];
    if (!lastMsg) return tr.noMessages;
    if (lastMsg.type === "audio") return tr.voiceMessage;
    return lastMsg.content.slice(0, 40);
  };

  const highlight = (text: string) => {
    if (!q || text === tr.voiceMessage) return text;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark>{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 pt-1">
        <div className="grid h-12 grid-cols-[1fr_auto_1fr] items-center">
          <span />
          <h1 className="text-lg font-medium">{tr.chats}</h1>
          <button
            onClick={() => setIsCreatingGroup(true)}
            aria-label={tr.newGroup}
            title={tr.newGroup}
            className="icon-btn -mr-2 justify-self-end"
          >
            <SquarePen className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint"
            strokeWidth={1.75}
          />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr.search}
            aria-label={tr.search}
            className="field h-10 rounded-full pr-9 pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                searchRef.current?.focus();
              }}
              aria-label={tr.closeSearch}
              className="icon-btn absolute top-1/2 right-1 size-8 -translate-y-1/2"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="no-scrollbar mt-1 flex shrink-0 items-center overflow-x-auto border-b border-line px-1">
        <button
          onClick={() => setActiveFolder("all")}
          className={`tab ${activeFolder === "all" ? "tab-active" : ""}`}
        >
          {tr.allChats}
        </button>
        <button
          onClick={() => setActiveFolder("unread")}
          className={`tab ${activeFolder === "unread" ? "tab-active" : ""}`}
        >
          {tr.unread}
          {totalUnread > 0 && <span className="count">{totalUnread}</span>}
        </button>
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="group/folder relative shrink-0"
            onMouseLeave={() => setConfirmDeleteFolder(null)}
          >
            <button
              onClick={() => setActiveFolder(folder.id)}
              className={`tab ${activeFolder === folder.id ? "tab-active" : ""}`}
            >
              {folder.name}
            </button>
            <button
              onClick={() =>
                confirmDeleteFolder === folder.id
                  ? deleteFolder(folder.id)
                  : setConfirmDeleteFolder(folder.id)
              }
              disabled={deletingFolder === folder.id}
              aria-label={
                confirmDeleteFolder === folder.id
                  ? tr.confirmDeleteFolder
                  : tr.deleteFolderTitle
              }
              title={
                confirmDeleteFolder === folder.id
                  ? tr.confirmDeleteFolder
                  : tr.deleteFolderTitle
              }
              className={`absolute top-0.5 right-0 z-10 flex size-4 cursor-pointer items-center justify-center rounded-full opacity-0 transition-opacity duration-150 group-focus-within/folder:opacity-100 group-hover/folder:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-40 ${
                confirmDeleteFolder === folder.id
                  ? "bg-danger text-on-primary"
                  : "bg-active text-muted hover:text-danger"
              } ${activeFolder === folder.id ? "[@media(hover:none)]:opacity-100" : ""}`}
            >
              {deletingFolder === folder.id ? (
                <Loader2 className="size-2.5 animate-spin" />
              ) : confirmDeleteFolder === folder.id ? (
                <Check className="size-2.5" />
              ) : (
                <X className="size-2.5" />
              )}
            </button>
          </div>
        ))}
        <button
          onClick={() => setIsCreatingFolder(true)}
          aria-label={tr.newFolder}
          title={tr.newFolder}
          className="icon-btn size-8"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-1.5">
        {!usersLoaded ? (
          <RowSkeletons count={7} avatar={54} />
        ) : allItems.length === 0 ? (
          <EmptyText>
            {q
              ? `${tr.nothingFound}: «${searchQuery}»`
              : activeFolder === "all"
                ? tr.noChatsYet
                : tr.noChatsInFolder}
          </EmptyText>
        ) : (
          allItems.map((item) => {
            if (item.type === "group") {
              const g = item.g;
              const preview = formatGroupPreview(g);
              const isAudioPreviewGroup = preview === tr.voiceMessage;
              const selectGroup = () =>
                onSelect({
                  id: g.id,
                  name: g.name,
                  image: g.avatar,
                  isGroup: true,
                });
              return (
                <div
                  key={g.id}
                  role="button"
                  tabIndex={0}
                  onClick={selectGroup}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectGroup();
                    }
                  }}
                  className={`${ROW_CLASS} ${selected?.id === g.id ? "bg-active" : "hover:bg-raised"}`}
                >
                  <Avatar name={g.name} image={g.avatar} size={54} group />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-base font-medium">
                        {highlight(g.name)}
                      </p>
                      <span className="shrink-0 text-xs text-muted tabular-nums">
                        {formatTime(item.time)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm text-muted ${isAudioPreviewGroup ? "italic" : ""}`}
                      >
                        {highlight(preview)}
                      </p>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted tabular-nums">
                        <Users className="size-3" />
                        {g.members?.length ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            const u = item.u;
            const isOnline = onlineUsers.has(u.id);
            const previewText = formatPreview(u.id);
            const isAudio = previews[u.id]?.type === "audio";
            const isOwn = previews[u.id]?.senderId === session?.user?.id;
            const unreadCount = unread[u.id] ?? 0;

            return (
              <div key={u.id} className="relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(u)}
                  onContextMenu={(e) => {
                    if (folders.length === 0) return;
                    e.preventDefault();
                    setMenuPosition({ x: e.clientX, y: e.clientY });
                    setFolderMenuUser(folderMenuUser === u.id ? null : u.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(u);
                    }
                  }}
                  className={`${ROW_CLASS} ${selected?.id === u.id ? "bg-active" : "hover:bg-raised"}`}
                >
                  <Avatar
                    name={u.name}
                    image={u.image}
                    size={54}
                    online={isOnline}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-base font-medium">
                        {highlight(u.name ?? "")}
                      </p>
                      {previews[u.id]?.createdAt && (
                        <span className="shrink-0 text-xs text-muted tabular-nums">
                          {formatTime(previews[u.id].createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm ${unreadCount > 0 ? "text-ink" : "text-muted"} ${isAudio ? "italic" : ""}`}
                      >
                        {isOwn ? (
                          <>
                            {tr.you}: {highlight(previewText)}
                          </>
                        ) : (
                          highlight(previewText)
                        )}
                      </p>
                      {unreadCount > 0 && (
                        <span className="count">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {folderMenuUser === u.id && (
                  <div
                    ref={menuRef}
                    className="menu fixed"
                    style={{ top: menuPosition.y, left: menuPosition.x }}
                  >
                    <p className="px-3 py-1.5 text-xs font-medium text-muted">
                      {tr.folders}
                    </p>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          toggleMember(folder.id, u.id);
                          setFolderMenuUser(null);
                        }}
                        className="menu-item"
                      >
                        <span className="flex-1">{folder.name}</span>
                        {isInFolder(folder.id, u.id) && (
                          <Check className="size-4" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isCreatingFolder && (
        <CreateFolderModal
          isOpen={isCreatingFolder}
          onClose={() => setIsCreatingFolder(false)}
          onCreate={createFolder}
        />
      )}
      {isCreatingGroup && (
        <CreateGroupModal
          onClose={() => setIsCreatingGroup(false)}
          onCreate={async (name, memberIds) => {
            const res = await fetch("/api/groups", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, memberIds }),
            });

            if (!res.ok) throw new Error("Failed to create group");

            const group: GroupChat = await res.json();

            setGroups((prev) => [group, ...prev]);

            setIsCreatingGroup(false);

            onSelect({
              id: group.id,
              name: group.name,
              image: group.avatar,
              isGroup: true,
            });

            return group;
          }}
        />
      )}
    </div>
  );
};

export default UserList;
