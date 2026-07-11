import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const email =
      typeof body === "object" && body && "email" in body
        ? (body as { email: unknown }).email
        : null;
    const password =
      typeof body === "object" && body && "password" in body
        ? (body as { password: unknown }).password
        : null;

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    await createSession(user.id, user.role, user.wardId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/login]", error);
    return NextResponse.json(
      {
        error:
          "Database connection failed. Check Neon is awake and DATABASE_URL is set.",
      },
      { status: 503 },
    );
  }
}
