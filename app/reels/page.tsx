"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
  Trash2,
  Loader2,
  Film,
  Plus,
  X,
} from "lucide-react";
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const viewedIds = useRef<Set<string>>(new Set());

  const previewUrl = useMemo(
    () => (uploadFile ? URL.createObjectURL(uploadFile) : null),
    [uploadFile],
  );

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

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
    if (!confirm(tr.deleteReelConfirm)) return;
    const prevReels = reels;
    setReels((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/reels/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete reel");
    } catch {
      setReels(prevReels);
    }
  };

  const closeUpload = () => {
    setShowUpload(false);
    setUploadFile(null);
    setUploadCaption("");
    setUploadError(null);
  };

  const uploadReel = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("video", uploadFile);
      const uploadRes = await fetch("/api/reels/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      const res = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: url, caption: uploadCaption || null }),
      });
      if (!res.ok) throw new Error("Reel creation failed");

      const newReel = await res.json();
      setReels((prev) => [
        { ...newReel, likesCount: 0, commentsCount: 0, isLiked: false },
        ...prev,
      ]);
      closeUpload();
    } catch {
      setUploadError(tr.uploadReelFailed);
    } finally {
      setUploading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-(--bg-primary) text-(--text-secondary) gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{tr.loadingReels}</span>
      </div>
    );
  }

  return (
    <div
      className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-(--bg-primary) relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onScroll={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200)
          void loadMore();
      }}
    >
      {userId && (
        <button
          onClick={() => setShowUpload(true)}
          aria-label={tr.newReel}
          className="fixed bottom-6 right-4 z-40 p-4 rounded-full bg-(--text-primary) text-(--bg-primary) shadow-lg active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {reels.length === 0 && (
        <div className="h-screen w-full flex flex-col items-center justify-center text-(--text-secondary) gap-3">
          <Film className="w-10 h-10" />
          <p>{tr.noReelsYet}</p>
        </div>
      )}

      {reels.map((reel) => (
        <div
          key={reel.id}
          className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden bg-black"
        >
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
            className="h-full w-full object-contain bg-black"
            onClick={() => setMuted((m) => !m)}
          />

          <div className="absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          <button
            onClick={() => setMuted((m) => !m)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90 transition-transform"
          >
            {muted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>

          <div className="absolute bottom-8 left-4 right-16 text-white">
            <div className="flex items-center gap-2 mb-1">
              {reel.user.image ? (
                <Image
                  src={reel.user.image}
                  alt={reel.user.name ?? ""}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover border border-white/30"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
                  {reel.user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <p className="font-semibold text-sm drop-shadow">
                {reel.user.name ?? tr.anonymous}
              </p>
            </div>
            {reel.caption && (
              <p className="text-sm text-white/90 drop-shadow leading-snug">
                {reel.caption}
              </p>
            )}
          </div>

          <div className="absolute bottom-24 right-3 flex flex-col items-center gap-6 text-white">
            <button
              onClick={() => toggleLike(reel.id)}
              disabled={!userId}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            >
              <Heart
                className="w-8 h-8 drop-shadow"
                fill={reel.isLiked ? "#ef4444" : "none"}
                stroke={reel.isLiked ? "#ef4444" : "white"}
              />
              <span className="text-xs font-medium drop-shadow">
                {reel.likesCount}
              </span>
            </button>

            <div className="flex flex-col items-center gap-1">
              <MessageCircle className="w-8 h-8 drop-shadow" stroke="white" />
              <span className="text-xs font-medium drop-shadow">
                {reel.commentsCount}
              </span>
            </div>

            {userId === reel.user.id && (
              <button
                onClick={() => deleteReel(reel.id)}
                aria-label={tr.delete}
                className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
              >
                <Trash2 className="w-7 h-7 drop-shadow text-red-400" />
              </button>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="h-screen w-full flex items-center justify-center text-(--text-secondary) gap-2 bg-(--bg-primary)">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{tr.loading}</span>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-(--bg-card) rounded-xl w-full max-w-sm flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <p className="text-(--text-primary) font-semibold">
                {tr.newReel}
              </p>
              <button
                onClick={closeUpload}
                aria-label={tr.cancel}
                className="text-(--text-secondary) active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewUrl ? (
              <video
                src={previewUrl}
                controls
                className="w-full max-h-64 rounded-lg bg-black"
              />
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-(--border) rounded-lg h-40 text-(--text-secondary) cursor-pointer">
                <Plus className="w-6 h-6" />
                <span className="text-sm">{tr.clickToSelectVideo}</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}

            <textarea
              value={uploadCaption}
              onChange={(e) => setUploadCaption(e.target.value)}
              placeholder={tr.descriptionOptional}
              rows={2}
              className="w-full bg-(--bg-secondary) text-(--text-primary) placeholder-(--text-secondary) rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-(--border)"
            />

            {uploadError && (
              <p className="text-red-400 text-sm">{uploadError}</p>
            )}

            <button
              onClick={uploadReel}
              disabled={!uploadFile || uploading}
              className="w-full bg-(--text-primary) text-(--bg-primary) font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                tr.postReel
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
