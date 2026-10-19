import { normalizeEmail } from "@/lib/password";
import { buildAuthenticationOptions } from "@/lib/passkey";
import {
  clientIdentity,
  consumeRateLimit,
} from "@/lib/rateLimit";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 30;
const MAX_SHARED = 80;

export async function POST(req: Request) {
  if (!isAllowedRequestOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ip, trusted } = clientIdentity(req);
  const limit = consumeRateLimit(
    `passkey:login:ip:${ip}`,
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

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const emailRaw =
    typeof body === "object" &&
    body &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";
  const email = emailRaw.trim() ? normalizeEmail(emailRaw) : null;

  const options = await buildAuthenticationOptions(email);
  return NextResponse.json(options, {
    headers: { "Cache-Control": "no-store" },
  });
}
