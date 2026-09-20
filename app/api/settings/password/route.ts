import { logAction } from "@/lib/audit";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  passwordMeetsPolicy,
  verifyPassword,
} from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { createSession, getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isAllowedRequestOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const currentPassword =
    typeof body === "object" &&
    body &&
    "currentPassword" in body &&
    typeof (body as { currentPassword: unknown }).currentPassword === "string"
      ? (body as { currentPassword: string }).currentPassword
      : null;
  const newPassword =
    typeof body === "object" &&
    body &&
    "newPassword" in body &&
    typeof (body as { newPassword: unknown }).newPassword === "string"
      ? (body as { newPassword: string }).newPassword
      : null;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required" },
      { status: 400 },
    );
  }

  if (!passwordMeetsPolicy(newPassword)) {
    return NextResponse.json(
      {
        error: `New password must be ${MIN_PASSWORD_LENGTH}–72 characters`,
      },
      { status: 400 },
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current one" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 },
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  await createSession(user.id, user.role, user.wardId);
  await logAction(session.userId, "CHANGED_PASSWORD", "User", user.id);

  return NextResponse.json({ success: true });
}
