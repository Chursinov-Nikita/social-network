import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed.length < 2 || trimmed.length > 30)
    return Response.json(
      { error: "Name must be 2-30 characters" },
      { status: 400 },
    );

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: trimmed },
  });

  return Response.json({ ok: true });
}
