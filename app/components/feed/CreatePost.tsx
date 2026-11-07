"use client";
import Avatar from "@/app/components/ui/Avatar";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import type { Post } from "@/app/types/feed";
import { ImagePlus, Loader2, SendHorizontal, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const MAX_RAW_SIZE_MB = 20;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const QUALITY = 0.8;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const compressImage = (file: File): Promise<File> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas error"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(
            new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            }),
          );
        },
        "image/jpeg",
        QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Load error"));
    };
    img.src = url;
  });

const CreatePost = ({
  onPostCreated,
}: {
  onPostCreated?: (post: Post) => void;
}) => {
  const { data: session, status } = useSession();
  const { lang } = useLang();
  const tr = t[lang];

  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError(tr.imageTypeError);
      return;
    }
    if (file.size > MAX_RAW_SIZE_MB * 1024 * 1024) {
      setImageError(tr.imageSizeError(MAX_RAW_SIZE_MB));
      return;
    }

    try {
      setCompressing(true);
      const compressed = await compressImage(file);
      if (preview) URL.revokeObjectURL(preview);
      setImage(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch {
      setImageError(tr.imageProcessingError);
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
    setImageError(null);
  };

  const handleSubmit = async () => {
    if (!content.trim() && !image) return;
    if (!session?.user?.id) return;
    setLoading(true);
    setImageError(null);

    try {
      let imageUrl: string | null = null;

      if (image) {
        const formData = new FormData();
        formData.append("file", image);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        imageUrl = (await res.json()).url;
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), imageUrl }),
      });
      if (!res.ok) throw new Error("Post creation failed");

      onPostCreated?.(await res.json());
      setContent("");
      removeImage();
    } catch {
      setImageError(tr.uploadFailed);
    } finally {
      setLoading(false);
    }
  };

  if (status === "unauthenticated") return null;

  const canSubmit =
    !loading && !compressing && Boolean(content.trim() || image);

  return (
    <div className="panel p-3">
      <div className="flex items-end gap-2">
        <div className="self-start py-0.5 pl-1">
          <Avatar
            name={session?.user?.name ?? session?.user?.email}
            image={session?.user?.image}
            size={36}
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSubmit) handleSubmit();
            }
          }}
          placeholder={tr.whatsOnYourMind}
          aria-label={tr.whatsOnYourMind}
          rows={1}
          className="thin-scroll field-sizing-content max-h-48 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-base outline-none placeholder:text-faint"
        />

        <label
          aria-label={tr.photo}
          title={tr.photo}
          className={`icon-btn ${compressing ? "pointer-events-none opacity-50" : ""}`}
        >
          <ImagePlus className="size-5" strokeWidth={1.75} />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleImageChange}
            disabled={compressing}
          />
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label={loading ? tr.posting : tr.post}
          title={tr.post}
          className="btn btn-primary size-10 shrink-0 px-0"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizontal className="size-4" />
          )}
        </button>
      </div>

      {imageError && (
        <p role="alert" className="mt-2 px-1 text-sm text-danger">
          {imageError}
        </p>
      )}
      {compressing && (
        <p className="mt-2 px-1 text-sm text-muted">{tr.imageCompressing}</p>
      )}

      {preview && !compressing && (
        <div className="relative mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="max-h-64 w-full rounded-xl object-cover"
          />
          <button
            type="button"
            onClick={removeImage}
            aria-label={tr.removeImage}
            className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
