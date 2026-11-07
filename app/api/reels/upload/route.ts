import { auth } from "@/auth";
import { getBlobToken } from "@/lib/reelStorage";
import { saveUpload, VIDEO_TYPES } from "@/lib/upload";
import { MAX_REEL_MB, MAX_THUMBNAIL_MB } from "@/app/types/reels";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

const MEGABYTE = 1024 * 1024;
const THUMBNAIL_TYPE = "image/jpeg";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json({ storage: getBlobToken() ? "blob" : "local" });
}

const issueBlobToken = async (req: Request, userId: string, token: string) => {
  const body = (await req.json()) as HandleUploadBody;

  const result = await handleUpload({
    body,
    request: req,
    token,
    onBeforeGenerateToken: async (pathname) => {
      if (!pathname.startsWith(`reels/${userId}/`))
        throw new Error("Invalid upload path");

      const isThumbnail = pathname.endsWith(".jpg");
      return {
        addRandomSuffix: true,
        allowedContentTypes: isThumbnail ? [THUMBNAIL_TYPE] : VIDEO_TYPES,
        maximumSizeInBytes:
          (isThumbnail ? MAX_THUMBNAIL_MB : MAX_REEL_MB) * MEGABYTE,
      };
    },
  });

  return Response.json(result);
};

const saveToDisk = async (req: Request) => {
  const formData = await req.formData();
  const thumbnail = formData.get("thumbnail");

  const result = thumbnail
    ? await saveUpload(thumbnail, {
        folder: "reels/thumbnails",
        allowedTypes: [THUMBNAIL_TYPE],
        maxSizeMb: MAX_THUMBNAIL_MB,
      })
    : await saveUpload(formData.get("video"), {
        folder: "reels",
        allowedTypes: VIDEO_TYPES,
        maxSizeMb: MAX_REEL_MB,
      });

  if ("error" in result)
    return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result);
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = getBlobToken();
  if (!token) return saveToDisk(req);

  try {
    return await issueBlobToken(req, session.user.id, token);
  } catch {
    return Response.json({ error: "Upload not allowed" }, { status: 400 });
  }
}
