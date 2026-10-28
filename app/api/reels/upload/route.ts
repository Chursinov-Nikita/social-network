import { auth } from "@/auth";
import { saveUpload, VIDEO_TYPES } from "@/lib/upload";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const result = await saveUpload(formData.get("video"), {
    folder: "reels",
    allowedTypes: VIDEO_TYPES,
    maxSizeMb: 100,
  });

  if ("error" in result)
    return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result);
}
