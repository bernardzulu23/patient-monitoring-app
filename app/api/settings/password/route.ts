import { logAction } from "@/lib/audit";
import {
  hashPassword,
  passwordPolicyError,
  verifyPassword,
} from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { clearRateLimit, hitRateLimit, isRateLimited } from "@/lib/rateLimit";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { createSession, getSessionAllowingPasswordChange } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CHANGE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_CHANGES = 5;

export async function POST(req: Request) {
  if (!isAllowedRequestOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await getSessionAllowingPasswordChange();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitKey = `pwchange:user:${session.userId}`;
  const limit = isRateLimited(limitKey, MAX_FAILED_CHANGES);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const policyError = passwordPolicyError(newPassword, user.email);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current one" },
      { status: 400 },
    );
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    hitRateLimit(limitKey, CHANGE_WINDOW_MS);
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 },
    );
  }
  clearRateLimit(limitKey);

  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  // New hash → every other session for this account is invalidated; reissue this one.
  await createSession(updated);
  await logAction(session.userId, "CHANGED_PASSWORD", "User", user.id);

  return NextResponse.json({ success: true });
}
