import { canManageStaff } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

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
  const session = await getSession();
  if (!session || !canManageStaff(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, role, wardId } = await req.json();

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (role !== "nurse" && role !== "doctor") {
    return NextResponse.json(
      { error: "Role must be nurse or doctor" },
      { status: 400 },
    );
  }
  if (role === "nurse" && (typeof wardId !== "string" || !wardId)) {
    return NextResponse.json(
      { error: "Ward is required for nurses" },
      { status: 400 },
    );
  }

  const temporaryPassword = randomBytes(5).toString("hex");
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        wardId: role === "nurse" ? wardId : null,
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
