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
  const { count } = await prisma.chatFolder.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (!count) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true });
}
