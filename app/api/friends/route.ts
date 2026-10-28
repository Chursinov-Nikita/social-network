import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const userSelect = { id: true, name: true, image: true } as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json([]);

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
    },
    include: {
      sender: { select: userSelect },
      receiver: { select: userSelect },
    },
  });

  return Response.json(friendships);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { receiverId } = await req.json();
  if (!receiverId || receiverId === session.user.id)
    return Response.json({ error: "Invalid receiver" }, { status: 400 });

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { senderId: session.user.id, receiverId },
        { senderId: receiverId, receiverId: session.user.id },
      ],
    },
  });

  if (existing) return Response.json(existing);

  const friendship = await prisma.friendship.create({
    data: { senderId: session.user.id, receiverId, status: "pending" },
  });

  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: "friend_request",
      content: `${session.user.name ?? "Someone"} sent you a friend request`,
      senderId: session.user.id,
    },
  });

  return Response.json(friendship);
}
