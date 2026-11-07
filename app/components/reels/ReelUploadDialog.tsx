"use client";

import { Dialog } from "@/app/components/ui/Dialog";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import { MAX_REEL_MB, MAX_REEL_SECONDS, type Reel } from "@/app/types/reels";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getUploadStorage,
  readVideoFile,
  REEL_VIDEO_TYPES,
  uploadReelThumbnail,
  uploadReelVideo,
} from "./reelFile";

const CAPTION_MAX_LENGTH = 300;
const DURATION_TOLERANCE_SECONDS = 0.5;
const MEGABYTE = 1024 * 1024;

type SelectedVideo = {
  file: File;
  previewUrl: string;
  duration: number;
  thumbnail: Blob | null;
};

const formatDuration = (seconds: number) => {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const ReelUploadDialog = ({
  userId,
  onClose,
  onPublished,
}: {
  userId: string;
  onClose: () => void;
  onPublished: (reel: Reel) => void;
}) => {
  const { lang } = useLang();
  const tr = t[lang];

  const [video, setVideo] = useState<SelectedVideo | null>(null);
  const [reading, setReading] = useState(false);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const uploading = progress !== null;
  const previewUrl = video?.previewUrl;

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  const selectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    if (!REEL_VIDEO_TYPES.includes(file.type)) {
      setError(tr.onlyVideoAllowed);
      return;
    }
    if (file.size > MAX_REEL_MB * MEGABYTE) {
      setError(tr.fileTooLarge);
      return;
    }

    setReading(true);
    try {
      const { duration, thumbnail } = await readVideoFile(file);
      if (duration > MAX_REEL_SECONDS + DURATION_TOLERANCE_SECONDS) {
        setError(tr.videoTooLong(MAX_REEL_SECONDS));
        return;
      }
      setVideo({
        file,
        previewUrl: URL.createObjectURL(file),
        duration,
        thumbnail,
      });
    } catch {
      setError(tr.videoUnreadable);
    } finally {
      setReading(false);
    }
  };

  const publish = async () => {
    if (!video || uploading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    setError(null);

    try {
      const storage = await getUploadStorage(controller.signal);
      const target = { storage, userId, signal: controller.signal };

      const videoUrl = await uploadReelVideo(video.file, target, setProgress);
      const thumbnailUrl = video.thumbnail
        ? await uploadReelThumbnail(video.thumbnail, target).catch(() => null)
        : null;

      const res = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          videoUrl,
          thumbnailUrl,
          caption: caption || null,
        }),
      });
      if (!res.ok) throw new Error("Reel creation failed");

      onPublished(await res.json());
    } catch {
      if (controller.signal.aborted) return;
      setError(tr.uploadReelFailed);
      setProgress(null);
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    onClose();
  };

  return (
    <Dialog title={tr.newReel} onClose={() => !uploading && onClose()}>
      <div className="mt-4 flex flex-col gap-3">
        {video ? (
          <div className="relative mx-auto aspect-9/16 h-[min(46dvh,22rem)] overflow-hidden rounded-xl bg-black">
            <video
              src={video.previewUrl}
              autoPlay
              muted
              loop
              playsInline
              className="size-full object-contain"
            />
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
              {formatDuration(video.duration)}
            </span>
            {!uploading && (
              <label
                aria-label={tr.replaceVideo}
                title={tr.replaceVideo}
                className="absolute top-2 right-2 flex size-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:opacity-85 focus-within:outline-2 focus-within:outline-white"
              >
                <RefreshCw className="size-4" />
                <input
                  type="file"
                  accept={REEL_VIDEO_TYPES.join(",")}
                  className="sr-only"
                  onChange={selectFile}
                />
              </label>
            )}
          </div>
        ) : (
          <label
            aria-busy={reading}
            className={`flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-4 text-center text-muted transition-colors hover:bg-raised hover:text-ink focus-within:border-ink ${reading ? "pointer-events-none" : ""}`}
          >
            {reading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <Plus className="size-6" />
            )}
            <span className="text-sm font-medium">{tr.clickToSelectVideo}</span>
            <span className="text-xs">{tr.videoSizeLimit}</span>
            <input
              type="file"
              accept={REEL_VIDEO_TYPES.join(",")}
              className="sr-only"
              disabled={reading}
              onChange={selectFile}
            />
          </label>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={tr.descriptionOptional}
          aria-label={tr.descriptionOptional}
          maxLength={CAPTION_MAX_LENGTH}
          disabled={uploading}
          rows={2}
          className="field h-auto resize-none py-2.5"
        />

        {uploading && (
          <div>
            <div
              role="progressbar"
              aria-label={tr.uploading}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              className="h-1.5 overflow-hidden rounded-full bg-active"
            >
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-sm text-muted tabular-nums">
              {tr.uploading} {Math.round(progress)}%
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-1">
          <button onClick={cancel} className="btn btn-ghost">
            {tr.cancel}
          </button>
          <button
            onClick={publish}
            disabled={!video || uploading}
            className="btn btn-primary"
          >
            {uploading && <Loader2 className="size-4 animate-spin" />}
            {tr.postReel}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default ReelUploadDialog;
