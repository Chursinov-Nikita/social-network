const THUMBNAIL_MAX_SIDE = 720;
const THUMBNAIL_QUALITY = 0.8;
const THUMBNAIL_SEEK_SECONDS = 0.1;
const READ_TIMEOUT_MS = 15000;
const THUMBNAIL_TIMEOUT_MS = 4000;
const UPLOAD_ROUTE = "/api/reels/upload";
const MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export const REEL_VIDEO_TYPES = Object.keys(EXTENSIONS);

type UploadTarget = {
  storage: "blob" | "local";
  userId: string;
  signal: AbortSignal;
};

const waitForEvent = (
  target: HTMLVideoElement,
  event: string,
  timeoutMs = READ_TIMEOUT_MS,
) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out")), timeoutMs);
    target.addEventListener(
      event,
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    target.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        reject(new Error("Unreadable video"));
      },
      { once: true },
    );
  });

const captureFrame = (video: HTMLVideoElement) =>
  new Promise<Blob | null>((resolve) => {
    const scale = Math.min(
      1,
      THUMBNAIL_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return resolve(null);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(resolve, "image/jpeg", THUMBNAIL_QUALITY);
  });

export const readVideoFile = async (file: File) => {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    const metadata = waitForEvent(video, "loadedmetadata");
    video.src = url;
    await metadata;

    if (!Number.isFinite(video.duration)) {
      const measured = waitForEvent(video, "durationchange");
      video.currentTime = Number.MAX_SAFE_INTEGER;
      await measured;
    }
    const duration = video.duration;
    if (!Number.isFinite(duration) || !video.videoWidth)
      throw new Error("Unreadable video");

    let thumbnail: Blob | null = null;
    try {
      const seeked = waitForEvent(video, "seeked", THUMBNAIL_TIMEOUT_MS);
      video.currentTime = Math.min(THUMBNAIL_SEEK_SECONDS, duration / 2);
      await seeked;
      thumbnail = await captureFrame(video);
    } catch {
      thumbnail = null;
    }

    return { duration, thumbnail };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
};

const uploadToDisk = (
  field: "video" | "thumbnail",
  file: Blob,
  signal: AbortSignal,
  onProgress?: (percent: number) => void,
) =>
  new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();
    formData.append(
      field,
      file,
      field === "thumbnail" ? "thumbnail.jpg" : "video",
    );

    signal.addEventListener("abort", () => request.abort(), { once: true });
    request.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 100);
    };
    request.onload = () => {
      if (request.status < 200 || request.status >= 300)
        return reject(new Error("Upload failed"));
      resolve(JSON.parse(request.responseText).url);
    };
    request.onerror = () => reject(new Error("Upload failed"));
    request.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    request.open("POST", UPLOAD_ROUTE);
    request.send(formData);
  });

const uploadToBlob = async (
  pathname: string,
  file: Blob,
  signal: AbortSignal,
  onProgress?: (percent: number) => void,
) => {
  const { upload } = await import("@vercel/blob/client");
  const result = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: UPLOAD_ROUTE,
    contentType: file.type,
    multipart: file.size > MULTIPART_THRESHOLD_BYTES,
    abortSignal: signal,
    onUploadProgress: (e) => onProgress?.(e.percentage),
  });
  return result.url;
};

export const uploadReelVideo = (
  file: File,
  { storage, userId, signal }: UploadTarget,
  onProgress: (percent: number) => void,
) =>
  storage === "blob"
    ? uploadToBlob(
        `reels/${userId}/video.${EXTENSIONS[file.type]}`,
        file,
        signal,
        onProgress,
      )
    : uploadToDisk("video", file, signal, onProgress);

export const uploadReelThumbnail = (
  thumbnail: Blob,
  { storage, userId, signal }: UploadTarget,
) =>
  storage === "blob"
    ? uploadToBlob(`reels/${userId}/poster.jpg`, thumbnail, signal)
    : uploadToDisk("thumbnail", thumbnail, signal);

export const getUploadStorage = async (signal: AbortSignal) => {
  const res = await fetch(UPLOAD_ROUTE, { signal });
  if (!res.ok) throw new Error("Storage check failed");
  const { storage } = (await res.json()) as { storage: "blob" | "local" };
  return storage;
};
