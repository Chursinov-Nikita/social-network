import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

type UploadOptions = {
  folder: string;
  allowedTypes: string[];
  maxSizeMb: number;
};

export type UploadResult = { url: string } | { error: string; status: number };

/** Validates a user-supplied file and stores it under `public/uploads/<folder>`. */
export const saveUpload = async (
  file: FormDataEntryValue | null,
  { folder, allowedTypes, maxSizeMb }: UploadOptions,
): Promise<UploadResult> => {
  if (!(file instanceof File)) return { error: "No file", status: 400 };
  if (!allowedTypes.includes(file.type) || !EXTENSIONS[file.type])
    return { error: "Unsupported file type", status: 415 };
  if (file.size > maxSizeMb * 1024 * 1024)
    return { error: `File exceeds ${maxSizeMb}MB`, status: 413 };

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });

  const fileName = `${randomUUID()}.${EXTENSIONS[file.type]}`;
  await writeFile(
    path.join(dir, fileName),
    Buffer.from(await file.arrayBuffer()),
  );

  return { url: `/uploads/${folder}/${fileName}` };
};

export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
