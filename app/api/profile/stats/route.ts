import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [posts, reels] = await Promise.all([
    prisma.post.count({ where: { authorId: session.user.id } }),
    prisma.reel.count({ where: { userId: session.user.id } }),
  ]);

  return Response.json({ posts, reels });
}
