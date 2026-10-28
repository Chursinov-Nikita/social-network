export type Reel = {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  user: { id: string; name: string | null; image: string | null };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
};
