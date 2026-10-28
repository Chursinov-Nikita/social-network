import { prisma } from "@/lib/prisma";
import type { Post } from "./types/feed";
import Feed from "./components/feed/Feed";

const PAGE_SIZE = 10;

export const dynamic = "force-dynamic";

export default async function Home() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: {
      author: { select: { id: true, name: true, image: true } },
      likes: { select: { userId: true } },
      _count: { select: { comments: true } },
    },
  });

  const initialPosts: Post[] = posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));

  return <Feed initialPosts={initialPosts} />;
}
