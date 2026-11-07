"use client";

import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import type { ChatUser } from "@/app/types/chat";
import { useEffect, useRef, useState } from "react";
import ChatWindow from "@/app/components/chat/ChatWindow";
import UserList from "@/app/components/chat/UserList";
import GroupChatWindow from "@/app/components/chat/GroupChatWindow";

const Chat = () => {
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const hasHistoryEntry = useRef(false);
  const { lang } = useLang();
  const tr = t[lang];

  useEffect(() => {
    const onPopState = () => {
      hasHistoryEntry.current = false;
      setSelectedUser(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const openChat = (user: ChatUser) => {
    if (!hasHistoryEntry.current) {
      window.history.pushState(null, "");
      hasHistoryEntry.current = true;
    }
    setSelectedUser(user);
  };

  const closeChat = () => {
    if (hasHistoryEntry.current) window.history.back();
    else setSelectedUser(null);
  };

  return (
    <div className="flex h-[calc(100dvh-var(--tabbar))] bg-canvas">
      <aside
        className={`w-full shrink-0 border-line bg-panel md:block md:w-80 md:border-r lg:w-90 ${selectedUser ? "hidden" : ""}`}
      >
        <UserList onSelect={openChat} selected={selectedUser} />
      </aside>
      <section
        className={`min-w-0 flex-1 bg-canvas ${selectedUser ? "fixed inset-0 z-40 md:static" : "hidden md:block"}`}
      >
        {selectedUser ? (
          selectedUser.isGroup ? (
            <GroupChatWindow
              key={selectedUser.id}
              groupId={selectedUser.id}
              groupName={selectedUser.name ?? ""}
              groupAvatar={selectedUser.image ?? null}
              onLeave={closeChat}
              onBack={closeChat}
            />
          ) : (
            <ChatWindow
              key={selectedUser.id}
              recipient={selectedUser}
              onChatDeleted={closeChat}
              onBack={closeChat}
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center px-4">
            <p className="rounded-full bg-panel px-3 py-1 text-sm text-muted">
              {tr.selectUserToChat}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Chat;
