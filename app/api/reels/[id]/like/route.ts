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
  const existing = await prisma.like.findUnique({
    where: { reelId_userId: { reelId: id, userId: session.user.id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return Response.json({ liked: false });
  }

  await prisma.like.create({
    data: { reelId: id, userId: session.user.id },
  });
  return Response.json({ liked: true });
}
