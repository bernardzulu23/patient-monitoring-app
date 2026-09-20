import { canManageStaff } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import {
  generateStaffId,
  generateStrongPassword,
  hashPassword,
  normalizeEmail,
} from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function looksLikeEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function uniqueStaffId(role: "doctor" | "nurse") {
  for (let i = 0; i < 8; i += 1) {
    const staffId = generateStaffId(role);
    const exists = await prisma.user.findUnique({ where: { staffId } });
    if (!exists) return staffId;
  }
  return generateStaffId(role);
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
      displayName: u.displayName,
      staffId: u.staffId,
      nrcOrPassport: u.nrcOrPassport,
      phone: u.phone,
      mustChangePassword: u.mustChangePassword,
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
  const fullNameRaw =
    typeof body === "object" && body && "fullName" in body
      ? (body as { fullName: unknown }).fullName
      : typeof body === "object" && body && "displayName" in body
        ? (body as { displayName: unknown }).displayName
        : null;
  const nrcOrPassportRaw =
    typeof body === "object" && body && "nrcOrPassport" in body
      ? (body as { nrcOrPassport: unknown }).nrcOrPassport
      : null;
  const phoneRaw =
    typeof body === "object" && body && "phone" in body
      ? (body as { phone: unknown }).phone
      : null;

  if (typeof fullNameRaw !== "string" || !fullNameRaw.trim()) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }
  if (typeof emailRaw !== "string" || !looksLikeEmail(normalizeEmail(emailRaw))) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (typeof nrcOrPassportRaw !== "string" || !nrcOrPassportRaw.trim()) {
    return NextResponse.json(
      { error: "NRC or passport number is required" },
      { status: 400 },
    );
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

  const temporaryPassword = generateStrongPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const staffId = await uniqueStaffId(role);
  const displayName = fullNameRaw.trim().slice(0, 120);
  const nrcOrPassport = nrcOrPassportRaw.trim().slice(0, 60);
  const phone =
    typeof phoneRaw === "string" && phoneRaw.trim()
      ? phoneRaw.trim().slice(0, 40)
      : null;

  try {
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(emailRaw),
        passwordHash,
        role,
        wardId: role === "nurse" && typeof wardId === "string" ? wardId : null,
        displayName,
        staffId,
        nrcOrPassport,
        phone,
        mustChangePassword: true,
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
          displayName: user.displayName,
          staffId: user.staffId,
          nrcOrPassport: user.nrcOrPassport,
          phone: user.phone,
          mustChangePassword: user.mustChangePassword,
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
