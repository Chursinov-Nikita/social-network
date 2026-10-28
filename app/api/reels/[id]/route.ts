import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const reel = await prisma.reel.findUnique({ where: { id } });
  if (!reel) return Response.json({ error: "Not found" }, { status: 404 });
  if (reel.userId !== session.user.id)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  await prisma.reel.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
