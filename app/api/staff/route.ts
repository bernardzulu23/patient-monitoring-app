import { canManageStaff } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { hashPassword, normalizeEmail } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { getSession } from "@/lib/session";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function looksLikeEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET() {
  const session = await getSession();
  if (!session || !canManageStaff(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    include: { ward: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      ward: u.ward,
    })),
  });
}

export async function POST(req: Request) {
  if (!isAllowedRequestOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || !canManageStaff(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const emailRaw =
    typeof body === "object" && body && "email" in body
      ? (body as { email: unknown }).email
      : null;
  const role =
    typeof body === "object" && body && "role" in body
      ? (body as { role: unknown }).role
      : null;
  const wardId =
    typeof body === "object" && body && "wardId" in body
      ? (body as { wardId: unknown }).wardId
      : null;

  if (typeof emailRaw !== "string" || !looksLikeEmail(normalizeEmail(emailRaw))) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (role !== "nurse" && role !== "doctor") {
    return NextResponse.json(
      { error: "Role must be nurse or doctor" },
      { status: 400 },
    );
  }
  if (role === "nurse") {
    if (typeof wardId !== "string" || !wardId) {
      return NextResponse.json(
        { error: "Ward is required for nurses" },
        { status: 400 },
      );
    }
    const ward = await prisma.ward.findUnique({ where: { id: wardId } });
    if (!ward) {
      return NextResponse.json({ error: "Ward not found" }, { status: 400 });
    }
  }

  const temporaryPassword = randomBytes(8).toString("hex");
  const passwordHash = await hashPassword(temporaryPassword);

  try {
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(emailRaw),
        passwordHash,
        role,
        wardId: role === "nurse" && typeof wardId === "string" ? wardId : null,
      },
      include: { ward: { select: { id: true, name: true } } },
    });

    await logAction(session.userId, "CREATED_STAFF", "User", user.id);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          ward: user.ward,
        },
        temporaryPassword,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Email already exists" },
      { status: 409 },
    );
  }
}
