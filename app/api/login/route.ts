import { logAction } from "@/lib/audit";
import { normalizeEmail, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  clearRateLimit,
  clientIp,
  hitRateLimit,
  isRateLimited,
} from "@/lib/rateLimit";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { createSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const INVALID = { error: "Invalid email or password" };
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = 10;
const MAX_ATTEMPTS_PER_EMAIL = 8;

function jsonError(status: number, body: object, retryAfterSec?: number) {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
  };
  if (retryAfterSec) headers["Retry-After"] = String(retryAfterSec);
  return NextResponse.json(body, { status, headers });
}

export async function POST(req: Request) {
  try {
    if (!isAllowedRequestOrigin(req)) {
      return jsonError(403, { error: "Forbidden" });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError(401, INVALID);
    }

    const emailRaw =
      typeof body === "object" && body && "email" in body
        ? (body as { email: unknown }).email
        : null;
    const password =
      typeof body === "object" && body && "password" in body
        ? (body as { password: unknown }).password
        : null;

    if (typeof emailRaw !== "string" || typeof password !== "string") {
      return jsonError(401, INVALID);
    }

    const email = normalizeEmail(emailRaw);
    if (!email || !password || password.length > 72) {
      return jsonError(401, INVALID);
    }

    const ip = clientIp(req);
    const ipKey = `login:ip:${ip}`;
    const emailKey = `login:email:${email}`;
    const ipLimit = isRateLimited(ipKey, MAX_ATTEMPTS_PER_IP);
    const emailLimit = isRateLimited(emailKey, MAX_ATTEMPTS_PER_EMAIL);

    if (ipLimit.limited || emailLimit.limited) {
      try {
        await logAction(null, "LOGIN_RATE_LIMITED", "Auth", email || ip);
      } catch (auditError) {
        console.error("[api/login] audit rate-limit", auditError);
      }
      return jsonError(
        429,
        { error: "Too many sign-in attempts. Try again in a few minutes." },
        Math.max(ipLimit.retryAfterSec, emailLimit.retryAfterSec),
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash ?? null);
    if (!user || !valid) {
      hitRateLimit(ipKey, LOGIN_WINDOW_MS);
      hitRateLimit(emailKey, LOGIN_WINDOW_MS);
      try {
        await logAction(null, "LOGIN_FAILED", "Auth", email);
      } catch (auditError) {
        console.error("[api/login] audit fail", auditError);
      }
      return jsonError(401, INVALID);
    }

    clearRateLimit(emailKey);
    await createSession(user.id, user.role, user.wardId);
    try {
      await logAction(user.id, "LOGGED_IN", "User", user.id);
    } catch (auditError) {
      console.error("[api/login] audit", auditError);
    }

    return NextResponse.json(
      {
        success: true,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/login]", error);
    return jsonError(503, {
      error: "Sign-in is temporarily unavailable. Try again shortly.",
    });
  }
}
