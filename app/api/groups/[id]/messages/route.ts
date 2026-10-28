import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/app/types/chat";

const senderSelect = { id: true, name: true, image: true } as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cursor = new URL(req.url).searchParams.get("cursor");

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  });
  if (!member) return Response.json({ error: "Forbidden" }, { status: 403 });

  // Newest page first, then reversed so the client renders oldest → newest.
  const messages = await prisma.message.findMany({
    where: {
      groupId: id,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: { sender: { select: senderSelect } },
  });

  return Response.json(messages.reverse());
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content, type = "text" } = await req.json();

  if (typeof content !== "string" || !content.trim())
    return Response.json({ error: "No content" }, { status: 400 });
  if (type !== "text" && type !== "audio")
    return Response.json({ error: "Invalid type" }, { status: 400 });

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  });
  if (!member) return Response.json({ error: "Forbidden" }, { status: 403 });

  const message = await prisma.message.create({
    data: {
      content: type === "text" ? content.trim() : content,
      type,
      senderId: session.user.id,
      groupId: id,
    },
    include: { sender: { select: senderSelect } },
  });

  return Response.json(message);
}
