import type { Message } from "@/app/types/chat";

/** Replaces the newest page with fresh data while keeping older pages loaded via "load older". */
export const mergeLatestPage = (prev: Message[], latest: Message[]) => {
  if (!latest.length) return [];
  const oldestLatest = latest[0].createdAt;
  const older = prev.filter((m) => m.createdAt < oldestLatest);
  return [...older, ...latest];
};
