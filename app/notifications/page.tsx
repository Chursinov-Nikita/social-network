"use client";

import PageHeader from "@/app/components/shell/PageHeader";
import Avatar from "@/app/components/ui/Avatar";
import { EmptyText, RowSkeletons } from "@/app/components/ui/States";
import { useLang } from "@/app/context/language";
import { useUnreadCounts } from "@/app/hooks/useUnreadCounts";
import { t } from "@/app/translation/translation";
import { typeLabel, type Notification } from "@/app/types/notifications";
import { CheckCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const Notifications = () => {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { lang } = useLang();
  const tr = t[lang];
  const { notifications: unreadCount } = useUnreadCounts();

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data: Notification[]) => setNotifications(data))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const markRead = async (id: string) => {
    await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleFriendRequest = async (
    notification: Notification,
    action: "accept" | "decline",
  ) => {
    if (!notification.friendshipId || actionLoadingId === notification.id)
      return;
    setActionLoadingId(notification.id);

    try {
      await fetch(`/api/friends/${notification.friendshipId}`, {
        method: action === "accept" ? "PATCH" : "DELETE",
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, read: true, friendshipId: null }
            : n,
        ),
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString(lang, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <>
      <PageHeader
        title={
          <>
            <span className="truncate">{tr.notificationsTitle}</span>
            {unreadCount > 0 && <span className="count">{unreadCount}</span>}
          </>
        }
        actions={
          unreadCount > 0 && (
            <button
              onClick={markAllRead}
              aria-label={tr.markAllAsRead}
              title={tr.markAllAsRead}
              className="btn btn-ghost -mr-2 size-10 px-0 sm:h-9 sm:w-auto sm:px-3"
            >
              <CheckCheck className="size-5 sm:hidden" strokeWidth={1.75} />
              <span className="hidden sm:inline">{tr.markAllAsRead}</span>
            </button>
          )
        }
      />

      <div className="mx-auto max-w-2xl py-2 sm:px-4 sm:py-4">
        <div className="panel py-1.5">
          {loading ? (
            <RowSkeletons count={5} avatar={40} />
          ) : notifications.length === 0 ? (
            <EmptyText>{tr.noNotificationsYet}</EmptyText>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`flex items-start gap-3 px-4 py-2.5 transition-colors duration-150 ${n.read ? "" : "cursor-pointer hover:bg-raised"}`}
              >
                <Avatar
                  name={n.sender?.name ?? n.type}
                  image={n.sender?.image}
                  size={40}
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-base ${n.read ? "text-muted" : "text-ink"}`}
                  >
                    {n.sender && typeLabel(n.type, tr) ? (
                      <>
                        <span className="font-medium text-ink">
                          {n.sender.name}
                        </span>{" "}
                        {typeLabel(n.type, tr)}
                      </>
                    ) : (
                      n.content
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-faint">
                    {formatDate(n.createdAt)}
                  </p>

                  {n.type === "friend_request" && n.friendshipId && (
                    <div
                      className="mt-2 flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleFriendRequest(n, "accept")}
                        disabled={actionLoadingId === n.id}
                        className="btn btn-secondary h-8 px-3"
                      >
                        {tr.accept}
                      </button>
                      <button
                        onClick={() => handleFriendRequest(n, "decline")}
                        disabled={actionLoadingId === n.id}
                        className="btn btn-ghost h-8 px-3"
                      >
                        {tr.decline}
                      </button>
                    </div>
                  )}
                </div>

                {!n.read && (
                  <span
                    aria-hidden="true"
                    className="mt-2 size-2 shrink-0 rounded-full bg-ink"
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Notifications;
