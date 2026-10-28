import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const POLL_INTERVAL_MS = 2000;

/** Streams unread message/notification counters to the header via Server-Sent Events. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stop = () => {
    closed = true;
    clearInterval(interval);
  };

  const stream = new ReadableStream({
    async start(controller) {
      const push = async () => {
        try {
          const [messages, notifications] = await Promise.all([
            prisma.message.count({
              where: { receiverId: userId, read: false },
            }),
            prisma.notification.count({ where: { userId, read: false } }),
          ]);
          if (closed) return;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ messages, notifications })}\n\n`,
            ),
          );
        } catch {
          if (closed) return;
          stop();
          controller.close();
        }
      };

      await push();
      if (!closed) interval = setInterval(push, POLL_INTERVAL_MS);
    },
    cancel: stop,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
