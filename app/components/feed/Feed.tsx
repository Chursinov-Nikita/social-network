"use client";
import PageHeader from "@/app/components/shell/PageHeader";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import type { Post } from "@/app/types/feed";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import CreatePost from "./CreatePost";
import PostCard from "./Post";

const PAGE_SIZE = 10;

const Feed = ({ initialPosts = [] }: { initialPosts: Post[] }) => {
  const { data: session } = useSession();
  const { lang } = useLang();
  const tr = t[lang];
  const currentUserId = session?.user?.id ?? null;

  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPosts.length === PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?page=${page}`);
      if (!res.ok) throw new Error("Failed to load posts");
      const newPosts: Post[] = await res.json();
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...newPosts.filter((p) => !ids.has(p.id))];
      });
      setPage((p) => p + 1);
      if (newPosts.length < PAGE_SIZE) setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title={tr.feed} />
      <div className="mx-auto max-w-2xl space-y-2 py-2 sm:space-y-3 sm:px-4 sm:py-4">
        <CreatePost
          onPostCreated={(newPost) => setPosts((prev) => [newPost, ...prev])}
        />

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            onPostDeleted={(id) =>
              setPosts((prev) => prev.filter((p) => p.id !== id))
            }
            onLikeChange={(id, liked) => {
              setPosts((prev) =>
                prev.map((p) => {
                  if (p.id !== id) return p;
                  return {
                    ...p,
                    likes: liked
                      ? [...p.likes, { userId: currentUserId! }]
                      : p.likes.filter((l) => l.userId !== currentUserId),
                  };
                }),
              );
            }}
          />
        ))}

        <button
          onClick={loadMore}
          disabled={loading || !hasMore}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm text-muted transition-colors ${hasMore ? "cursor-pointer hover:bg-panel hover:text-ink" : ""}`}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {tr.loading}
            </>
          ) : !hasMore ? (
            tr.noMorePosts
          ) : (
            tr.loadMore
          )}
        </button>
      </div>
    </>
  );
};

export default Feed;
