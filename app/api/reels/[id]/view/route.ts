import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // A view is counted once per user: the unique (reelId, userId) pair dedupes repeats.
  const { count } = await prisma.reelView.createMany({
    data: [{ reelId: id, userId: session.user.id }],
    skipDuplicates: true,
  });
  if (count) {
    await prisma.reel.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });
  }

  return Response.json({ ok: true });
}
