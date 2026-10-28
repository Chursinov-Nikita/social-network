import { auth } from "@/auth";
import { IMAGE_TYPES, saveUpload } from "@/lib/upload";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const result = await saveUpload(formData.get("file"), {
    folder: "posts",
    allowedTypes: IMAGE_TYPES,
    maxSizeMb: 10,
  });

  if ("error" in result)
    return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result);
}
