import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserProfile from "@/app/components/profile/UserProfile";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      createdAt: true,
      _count: { select: { posts: true, reels: true } },
    },
  });

  if (!user) notFound();

  return (
    <UserProfile user={{ ...user, createdAt: user.createdAt.toISOString() }} />
  );
}
