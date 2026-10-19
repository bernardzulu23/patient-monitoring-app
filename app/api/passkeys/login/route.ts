import { logAction } from "@/lib/audit";
import { verifyAuthentication } from "@/lib/passkey";
import {
  clientIdentity,
  consumeRateLimit,
  hitRateLimit,
} from "@/lib/rateLimit";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { createSession } from "@/lib/session";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 30;
const MAX_SHARED = 80;

function isAuthenticationResponse(
  value: unknown,
): value is AuthenticationResponseJSON {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id: unknown }).id === "string" &&
    "response" in value
  );
}

export async function POST(req: Request) {
  try {
    if (!isAllowedRequestOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { ip, trusted } = clientIdentity(req);
    const ipKey = `passkey:login:ip:${ip}`;
    const limit = consumeRateLimit(
      ipKey,
      trusted ? MAX_PER_IP : MAX_SHARED,
      WINDOW_MS,
    );
    if (limit.limited) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Try again in a few minutes." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSec) },
        },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid passkey response" },
        { status: 400 },
      );
    }

    if (!isAuthenticationResponse(body)) {
      return NextResponse.json(
        { error: "Invalid passkey response" },
        { status: 400 },
      );
    }

    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      console.error("[api/passkeys/login] SESSION_SECRET missing");
      return NextResponse.json(
        { error: "Sign-in is temporarily unavailable. Try again shortly." },
        { status: 503 },
      );
    }

    const result = await verifyAuthentication(body);
    if (!result.ok) {
      hitRateLimit(ipKey, WINDOW_MS);
      try {
        await logAction(null, "LOGIN_FAILED", "Auth", "passkey");
      } catch {
        /* ignore */
      }
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    await createSession(result.user);
    try {
      await logAction(result.user.id, "LOGIN_PASSKEY", "User", result.user.id);
    } catch (auditError) {
      console.error("[api/passkeys/login] audit", auditError);
    }

    return NextResponse.json(
      {
        success: true,
        role: result.user.role,
        mustChangePassword: result.user.mustChangePassword,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/passkeys/login]", error);
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Try again shortly." },
      { status: 503 },
    );
  }
}
