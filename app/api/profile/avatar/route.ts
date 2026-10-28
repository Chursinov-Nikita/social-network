import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IMAGE_TYPES, saveUpload } from "@/lib/upload";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const result = await saveUpload(formData.get("file"), {
    folder: "avatars",
    allowedTypes: IMAGE_TYPES,
    maxSizeMb: 5,
  });

  if ("error" in result)
    return Response.json({ error: result.error }, { status: result.status });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: result.url },
  });

  return Response.json(result);
}
