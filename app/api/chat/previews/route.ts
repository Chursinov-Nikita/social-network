import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { MessagePreview } from "@/app/types/chat";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({});

  const userId = session.user.id;
  const messages = await prisma.message.findMany({
    where: {
      groupId: null,
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "desc" },
  });

  const previews: Record<string, MessagePreview> = {};
  const unread: Record<string, number> = {};

  for (const msg of messages) {
    const companionId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    if (!companionId || !msg.receiverId) continue;

    previews[companionId] ??= {
      content: msg.content,
      type: msg.type,
      createdAt: msg.createdAt.toISOString(),
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      read: msg.read,
    };
    if (msg.receiverId === userId && !msg.read) {
      unread[companionId] = (unread[companionId] ?? 0) + 1;
    }
  }

  return Response.json({ previews, unread });
}
