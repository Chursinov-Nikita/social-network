export const MAX_REEL_SECONDS = 60;
export const MAX_REEL_MB = 100;
export const MAX_THUMBNAIL_MB = 5;

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
