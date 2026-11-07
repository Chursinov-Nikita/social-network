"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
  Trash2,
  Plus,
} from "lucide-react";
import ReelUploadDialog from "@/app/components/reels/ReelUploadDialog";
import Avatar from "@/app/components/ui/Avatar";
import { ConfirmDialog } from "@/app/components/ui/Dialog";
import { Spinner } from "@/app/components/ui/States";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import type { Reel } from "@/app/types/reels";

type ReelsResponse = { reels: Reel[]; nextCursor: string | null };

const fetchReels = async (cursor: string | null): Promise<ReelsResponse> => {
  const res = await fetch(
    cursor ? `/api/reels?cursor=${cursor}` : "/api/reels",
  );
  if (!res.ok) throw new Error("Failed to load reels");
  return res.json();
};

export default function ReelsPage() {
  const { data: session } = useSession();
  const { lang } = useLang();
  const tr = t[lang];
  const userId = session?.user?.id;

  const [reels, setReels] = useState<Reel[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [reelToDelete, setReelToDelete] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const viewedIds = useRef<Set<string>>(new Set());
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReels(null)
      .then((data) => {
        setReels(data.reels);
        setCursor(data.nextCursor);
      })
      .catch(() => setCursor(null))
      .finally(() => setInitialLoading(false));
  }, []);

  const loadMore = async () => {
    if (loading || !cursor) return;
    setLoading(true);
    try {
      const data = await fetchReels(cursor);
      setReels((prev) => [...prev, ...data.reels]);
      setCursor(data.nextCursor);
    } catch {
      setCursor(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const id = video.dataset.reelId as string;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
            if (userId && !viewedIds.current.has(id)) {
              viewedIds.current.add(id);
              fetch(`/api/reels/${id}/view`, { method: "POST" });
            }
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 },
    );

    Object.values(videoRefs.current).forEach(
      (el) => el && observer.observe(el),
    );
    return () => observer.disconnect();
  }, [reels, userId]);

  const flipLike = (id: string) =>
    setReels((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              isLiked: !r.isLiked,
              likesCount: r.likesCount + (r.isLiked ? -1 : 1),
            }
          : r,
      ),
    );

  const toggleLike = async (id: string) => {
    if (!userId) return;
    flipLike(id);
    try {
      const res = await fetch(`/api/reels/${id}/like`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle like");
    } catch {
      flipLike(id);
    }
  };

  const deleteReel = async (id: string) => {
    const prevReels = reels;
    setReels((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/reels/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete reel");
    } catch {
      setReels(prevReels);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-[calc(100dvh-var(--tabbar))] items-center justify-center">
        <h1 className="sr-only">{tr.reels}</h1>
        <Spinner label={tr.loadingReels} />
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="no-scrollbar relative h-[calc(100dvh-var(--tabbar))] w-full snap-y snap-mandatory overflow-y-scroll bg-black md:bg-canvas"
      onScroll={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200)
          void loadMore();
      }}
    >
      <h1 className="sr-only">{tr.reels}</h1>

      {userId && (
        <button
          onClick={() => setShowUpload(true)}
          aria-label={tr.newReel}
          title={tr.newReel}
          className="btn fixed top-3 left-3 z-20 size-10 bg-white px-0 text-black hover:opacity-85 md:top-4 md:right-6 md:left-auto md:bg-primary md:text-on-primary"
        >
          <Plus className="size-5" />
        </button>
      )}

      {reels.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-canvas px-4 text-center">
          <p className="text-base text-muted">{tr.noReelsYet}</p>
          {userId && (
            <button
              onClick={() => setShowUpload(true)}
              className="btn btn-primary"
            >
              {tr.newReel}
            </button>
          )}
        </div>
      )}

      {reels.map((reel) => (
        <section
          key={reel.id}
          className="relative flex h-full w-full snap-start items-center justify-center md:gap-3 md:p-4"
        >
          <div className="relative h-full w-full overflow-hidden bg-black md:aspect-9/16 md:w-auto md:rounded-2xl">
            <video
              ref={(el) => {
                videoRefs.current[reel.id] = el;
              }}
              data-reel-id={reel.id}
              src={reel.videoUrl}
              poster={reel.thumbnailUrl ?? undefined}
              loop
              muted={muted}
              playsInline
              className="h-full w-full bg-black object-contain"
              onClick={() => setMuted((m) => !m)}
            />

            <button
              onClick={() => setMuted((m) => !m)}
              aria-label={tr.toggleSound}
              aria-pressed={!muted}
              className="absolute top-3 right-3 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-transform duration-150 active:scale-90"
            >
              {muted ? (
                <VolumeX className="size-5" />
              ) : (
                <Volume2 className="size-5" />
              )}
            </button>

            <div className="absolute right-16 bottom-3 left-3 rounded-2xl bg-black/60 p-3 text-white md:right-3">
              <div className="flex items-center gap-2.5">
                <Avatar
                  name={reel.user.name ?? tr.anonymous}
                  image={reel.user.image}
                  size={36}
                />
                <p className="truncate text-base font-medium">
                  {reel.user.name ?? tr.anonymous}
                </p>
              </div>
              {reel.caption && (
                <p className="mt-1.5 text-base wrap-break-word">
                  {reel.caption}
                </p>
              )}
            </div>
          </div>

          <div className="absolute right-2 bottom-20 flex flex-col items-center gap-3 text-white md:static md:self-end md:pb-2 md:text-ink">
            <button
              onClick={() => toggleLike(reel.id)}
              disabled={!userId}
              aria-pressed={reel.isLiked}
              aria-label={`${tr.likes}: ${reel.likesCount}`}
              className="flex cursor-pointer flex-col items-center gap-1 transition-transform duration-150 active:scale-90 disabled:cursor-default"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-black/60 md:bg-panel">
                <Heart
                  className={`size-6 ${reel.isLiked ? "fill-current" : ""}`}
                  strokeWidth={1.75}
                />
              </span>
              <span className="rounded-full bg-black/60 px-1.5 text-xs font-medium tabular-nums md:bg-transparent">
                {reel.likesCount}
              </span>
            </button>

            <div className="flex flex-col items-center gap-1">
              <span className="flex size-11 items-center justify-center rounded-full bg-black/60 md:bg-panel">
                <MessageCircle className="size-6" strokeWidth={1.75} />
              </span>
              <span className="rounded-full bg-black/60 px-1.5 text-xs font-medium tabular-nums md:bg-transparent">
                {reel.commentsCount}
              </span>
            </div>

            {userId === reel.user.id && (
              <button
                onClick={() => setReelToDelete(reel.id)}
                aria-label={tr.delete}
                className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-black/60 transition-transform duration-150 active:scale-90 md:bg-panel"
              >
                <Trash2 className="size-5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </section>
      ))}

      {loading && (
        <div className="flex h-full items-center justify-center bg-canvas">
          <Spinner label={tr.loading} />
        </div>
      )}

      {reelToDelete && (
        <ConfirmDialog
          title={tr.delete}
          description={tr.deleteReelConfirm}
          confirmLabel={tr.delete}
          cancelLabel={tr.cancel}
          onConfirm={() => {
            const id = reelToDelete;
            setReelToDelete(null);
            void deleteReel(id);
          }}
          onCancel={() => setReelToDelete(null)}
        />
      )}

      {showUpload && userId && (
        <ReelUploadDialog
          userId={userId}
          onClose={() => setShowUpload(false)}
          onPublished={(newReel) => {
            setReels((prev) => [
              { ...newReel, likesCount: 0, commentsCount: 0, isLiked: false },
              ...prev,
            ]);
            setShowUpload(false);
            scrollerRef.current?.scrollTo({ top: 0 });
          }}
        />
      )}
    </div>
  );
}
