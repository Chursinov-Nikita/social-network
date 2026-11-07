"use client";
import Avatar from "@/app/components/ui/Avatar";
import { ConfirmDialog } from "@/app/components/ui/Dialog";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import type { Comment, Post } from "@/app/types/feed";
import {
  ChatBubbleLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  HeartIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { Loader2, SendHorizontal } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ru, enUS } from "date-fns/locale";

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (isoString: string, lang: string) => {
  const date = new Date(isoString);
  const locale = lang === "ru" ? ru : enUS;

  if (Date.now() - date.getTime() < DAY_MS) {
    return formatDistanceToNow(date, { addSuffix: true, locale });
  }
  return format(date, "dd.MM.yyyy HH:mm", { locale });
};

// Comments are cached per post so reopening a thread doesn't refetch it.
const MAX_CACHE = 50;
const cache = new Map<string, Comment[]>();
const setCache = (id: string, comments: Comment[]) => {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
  cache.set(id, comments);
};

type Props = {
  post: Post;
  currentUserId: string | null;
  onPostDeleted?: (id: string) => void;
  onLikeChange?: (id: string, liked: boolean) => void;
};

const PostCard = ({
  post,
  currentUserId,
  onPostDeleted,
  onLikeChange,
}: Props) => {
  const { lang } = useLang();
  const tr = t[lang];

  const liked = (post.likes ?? []).some((l) => l.userId === currentUserId);
  const likesCount = (post.likes ?? []).length;

  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(cache.get(post.id) ?? []);
  const [commentsCount, setCommentsCount] = useState(post._count.comments);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingComment, setLoadingComment] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const loadComments = useCallback(
    async (force = false) => {
      const cached = cache.get(post.id);
      if (cached && !force) {
        setComments(cached);
        return;
      }
      setLoadingComments(true);
      const res = await fetch(`/api/posts/${post.id}/comments`);
      const data: Comment[] = await res.json();
      setCache(post.id, data);
      setComments(data);
      setCommentsCount(data.length);
      setLoadingComments(false);
    },
    [post.id],
  );

  useEffect(() => {
    if (showComments) loadComments();
  }, [showComments, loadComments]);

  const handleLike = async () => {
    if (!currentUserId || isLiking) return;
    setIsLiking(true);
    onLikeChange?.(post.id, !liked);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json();
      if (data.liked !== !liked) onLikeChange?.(post.id, data.liked);
    } catch {
      onLikeChange?.(post.id, liked);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !currentUserId) return;
    setLoadingComment(true);
    const optimistic: Comment = {
      id: crypto.randomUUID(),
      content: commentText.trim(),
      postId: post.id,
      authorId: currentUserId,
      author: { id: currentUserId, name: tr.you, image: null },
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => {
      const next = [...prev, optimistic];
      setCache(post.id, next);
      return next;
    });
    setCommentsCount((c) => c + 1);
    setCommentText("");

    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: optimistic.content }),
      });
      if (!res.ok) throw new Error("Failed to save comment");
      const saved: Comment = await res.json();
      setComments((prev) => {
        const next = prev.map((c) => (c.id === optimistic.id ? saved : c));
        setCache(post.id, next);
        return next;
      });
    } catch {
      setComments((prev) => {
        const next = prev.filter((c) => c.id !== optimistic.id);
        setCache(post.id, next);
        return next;
      });
      setCommentsCount((c) => c - 1);
      setCommentText(optimistic.content);
    } finally {
      setLoadingComment(false);
    }
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    const prev = comments;
    setComments((c) => {
      const next = c.filter((x) => x.id !== commentToDelete);
      setCache(post.id, next);
      setCommentsCount(next.length);
      return next;
    });
    setCommentToDelete(null);
    try {
      const res = await fetch(
        `/api/posts/${post.id}/comments/${commentToDelete}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Failed to delete comment");
    } catch {
      setComments(prev);
      setCommentsCount(prev.length);
    }
  };

  const handleDeletePost = async () => {
    if (deletingPost) return;
    setDeletingPost(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");
      cache.delete(post.id);
      onPostDeleted?.(post.id);
    } catch {
      setDeletingPost(false);
    }
  };

  const isOwn = currentUserId === post.authorId;
  const username = post.author.name ?? tr.anonymous;

  return (
    <article className="panel">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <Avatar name={username} image={post.author.image} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium">{username}</p>
          <p className="text-xs text-faint">
            {formatDate(post.createdAt, lang)}
          </p>
        </div>

        {isOwn && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((p) => !p)}
              aria-label={tr.moreActions}
              aria-expanded={showMenu}
              className="icon-btn -mr-2"
            >
              <EllipsisHorizontalIcon className="size-5" />
            </button>
            {showMenu && (
              <div className="menu absolute top-10 right-0">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteModal(true);
                  }}
                  className="menu-item menu-item-danger"
                >
                  <TrashIcon className="size-4" />
                  {tr.deletePost}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {post.content && (
        <p className="px-4 pb-3 text-base wrap-break-word whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {post.imageUrl && (
        <Image
          src={post.imageUrl}
          width={0}
          height={0}
          sizes="(max-width: 672px) 100vw, 640px"
          className="mb-3 h-auto max-h-[70vh] w-full object-cover"
          alt={tr.postImageAlt}
        />
      )}

      <div className="px-4 pb-3">
        <button
          onClick={handleLike}
          disabled={!currentUserId || isLiking}
          aria-pressed={liked}
          aria-label={`${tr.likes}: ${likesCount}`}
          className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm tabular-nums transition-[background-color,color,scale] duration-150 active:scale-95 disabled:cursor-default disabled:active:scale-100 ${
            liked
              ? "bg-primary text-on-primary"
              : "bg-raised text-muted enabled:hover:bg-active enabled:hover:text-ink"
          }`}
        >
          {liked ? (
            <HeartSolidIcon className="size-4" />
          ) : (
            <HeartIcon className="size-4" />
          )}
          {likesCount}
        </button>
      </div>

      <button
        onClick={() => setShowComments((p) => !p)}
        aria-expanded={showComments}
        className={`flex h-11 w-full cursor-pointer items-center gap-3 border-t border-line px-4 text-sm text-muted transition-colors duration-150 hover:bg-raised hover:text-ink ${showComments ? "" : "sm:rounded-b-2xl"}`}
      >
        <ChatBubbleLeftIcon className="size-5 shrink-0" />
        <span className="flex-1 text-left">
          {commentsCount === 0
            ? tr.leaveComment
            : tr.commentsCount(commentsCount)}
        </span>
        <ChevronRightIcon
          className={`size-4 shrink-0 transition-transform duration-150 ${showComments ? "rotate-90" : ""}`}
        />
      </button>

      {showComments && (
        <div className="border-t border-line px-4 py-3">
          <div className="thin-scroll max-h-72 space-y-3 overflow-y-auto">
            {loadingComments ? (
              <span className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" />
                {tr.loadingComments}
              </span>
            ) : comments.length === 0 ? (
              <p className="py-1 text-sm text-muted">{tr.noCommentsYet}</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="group/comment flex gap-2.5">
                  <Avatar
                    name={comment.author.name}
                    image={comment.author.image}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {comment.author.name}
                    </p>
                    <p className="text-sm wrap-break-word whitespace-pre-wrap text-muted">
                      {comment.content}
                    </p>
                  </div>
                  {comment.authorId === currentUserId && (
                    <button
                      onClick={() => setCommentToDelete(comment.id)}
                      aria-label={tr.deleteComment}
                      className="icon-btn size-8 hover:text-danger"
                    >
                      <XMarkIcon className="size-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {currentUserId && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder={tr.writeComment}
                aria-label={tr.writeComment}
                className="field h-10 rounded-full"
              />
              <button
                onClick={handleComment}
                disabled={loadingComment || !commentText.trim()}
                aria-label={tr.send}
                className="btn btn-primary size-10 shrink-0 px-0"
              >
                <SendHorizontal className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {commentToDelete && (
        <ConfirmDialog
          title={tr.deleteComment}
          description={tr.deleteCommentDesc}
          confirmLabel={tr.delete}
          cancelLabel={tr.cancel}
          onConfirm={confirmDeleteComment}
          onCancel={() => setCommentToDelete(null)}
        />
      )}

      {showDeleteModal && (
        <ConfirmDialog
          title={tr.deletePost}
          description={tr.deletePostDesc}
          confirmLabel={tr.delete}
          cancelLabel={tr.cancel}
          pendingLabel={tr.deleting}
          pending={deletingPost}
          onConfirm={handleDeletePost}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </article>
  );
};

export default PostCard;
