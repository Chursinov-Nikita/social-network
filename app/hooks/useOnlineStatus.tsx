import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type OnlineData = {
  online: boolean;
  lastSeen: string | null;
};

const PING_INTERVAL_MS = 20_000;
const STATUS_INTERVAL_MS = 15_000;

export const useOnlineStatus = (userIds: string[]) => {
  const { data: session } = useSession();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});
  const idsKey = userIds.join(",");

  useEffect(() => {
    if (!session?.user?.id) return;

    const ping = () => fetch("/api/chat/online", { method: "POST" });
    void ping();
    const interval = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!idsKey) return;

    const fetchStatus = async () => {
      const res = await fetch(`/api/chat/online?ids=${idsKey}`);
      if (!res.ok) return;
      const data: Record<string, OnlineData> = await res.json();

      const online = new Set<string>();
      const seen: Record<string, string> = {};

      for (const [id, info] of Object.entries(data)) {
        if (info.online) online.add(id);
        if (info.lastSeen) seen[id] = info.lastSeen;
      }

      setOnlineUsers(online);
      setLastSeen(seen);
    };

    void fetchStatus();
    const interval = setInterval(fetchStatus, STATUS_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [idsKey]);

  return { onlineUsers, lastSeen };
};
