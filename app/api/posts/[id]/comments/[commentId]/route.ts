import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;

  const { count } = await prisma.comment.deleteMany({
    where: { id: commentId, authorId: session.user.id },
  });
  if (!count) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true });
}
