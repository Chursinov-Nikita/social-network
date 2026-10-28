import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export const useUnreadCounts = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });

  useEffect(() => {
    if (!userId) return;

    const es = new EventSource("/api/sse");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setCounts({
        messages: data.messages ?? 0,
        notifications: data.notifications ?? 0,
      });
    };
    es.onerror = () => es.close();

    return () => es.close();
  }, [userId]);

  return userId ? counts : { messages: 0, notifications: 0 };
};
