import { del } from "@vercel/blob";
import { unlink } from "fs/promises";
import path from "path";

const LOCAL_MEDIA_PATTERN = /^\/uploads\/reels\/(?:[\w-]+\/)*[\w-]+\.\w+$/;
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export const getBlobToken = () =>
  process.env.BLOB_VIDEOS_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;

const getBlobHost = () => {
  const storeId = getBlobToken()?.split("_")[3]?.toLowerCase();
  return storeId ? `${storeId}${BLOB_HOST_SUFFIX}` : null;
};

const parseUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isOwnBlobUrl = (value: string, userId: string) => {
  const url = parseUrl(value);
  return (
    url?.protocol === "https:" &&
    url.hostname === getBlobHost() &&
    url.pathname.startsWith(`/reels/${userId}/`)
  );
};

export const isReelMediaUrl = (
  value: unknown,
  userId: string,
): value is string =>
  typeof value === "string" &&
  (LOCAL_MEDIA_PATTERN.test(value) || isOwnBlobUrl(value, userId));

export const removeReelMedia = async (urls: (string | null)[]) => {
  const stored = urls.filter((url): url is string => Boolean(url));
  const blobHost = getBlobHost();
  const blobUrls = stored.filter(
    (url) => blobHost && parseUrl(url)?.hostname === blobHost,
  );
  const localUrls = stored.filter((url) => LOCAL_MEDIA_PATTERN.test(url));

  await Promise.allSettled([
    ...(blobUrls.length ? [del(blobUrls, { token: getBlobToken() })] : []),
    ...localUrls.map((url) =>
      unlink(path.join(process.cwd(), "public", ...url.split("/").slice(1))),
    ),
  ]);
};
