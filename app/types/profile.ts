export type PublicProfile = {
  id: string;
  name: string | null;
  image: string | null;
  createdAt: string;
  _count: { posts: number; reels: number };
};
