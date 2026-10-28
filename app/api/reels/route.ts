import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const PAGE_SIZE = 5;

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const cursor = new URL(req.url).searchParams.get("cursor");

  const reels = await prisma.reel.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { likes: true, comments: true } },
      likes: userId ? { where: { userId }, select: { id: true } } : false,
    },
  });

  const data = reels.map((r) => ({
    id: r.id,
    videoUrl: r.videoUrl,
    thumbnailUrl: r.thumbnailUrl,
    caption: r.caption,
    createdAt: r.createdAt,
    user: r.user,
    likesCount: r._count.likes,
    commentsCount: r._count.comments,
    isLiked: userId ? r.likes.length > 0 : false,
  }));

  return Response.json({
    reels: data,
    nextCursor: reels.length === PAGE_SIZE ? reels[reels.length - 1].id : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { videoUrl, thumbnailUrl, caption } = await req.json();
  if (typeof videoUrl !== "string" || !videoUrl.startsWith("/uploads/reels/"))
    return Response.json({ error: "videoUrl is required" }, { status: 400 });

  const reel = await prisma.reel.create({
    data: {
      videoUrl,
      thumbnailUrl,
      caption: typeof caption === "string" ? caption.trim() || null : null,
      userId: session.user.id,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return Response.json(reel);
}
