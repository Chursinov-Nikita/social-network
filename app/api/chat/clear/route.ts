import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { recipientId, mode } = await req.json();
  if (!recipientId || (mode !== "mine" && mode !== "all"))
    return Response.json({ error: "Invalid request" }, { status: 400 });

  if (mode === "mine") {
    await prisma.message.deleteMany({
      where: { senderId: session.user.id, receiverId: recipientId },
    });
  } else {
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: recipientId },
          { senderId: recipientId, receiverId: session.user.id },
        ],
      },
    });
  }

  return Response.json({ ok: true });
}
