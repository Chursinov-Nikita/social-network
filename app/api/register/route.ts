import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !email || !password)
    return Response.json({ error: "All fields are required" }, { status: 400 });

  if (!EMAIL_RE.test(email))
    return Response.json({ error: "Invalid email" }, { status: 400 });

  if (password.length < 6)
    return Response.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing)
    return Response.json({ error: "Email is already taken" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { name, email, password: hashed } });

  return Response.json({ ok: true });
}
