import { logAction } from "@/lib/audit";
import { toPublicPasskey, verifyAndStoreRegistration } from "@/lib/passkey";
import { prisma } from "@/lib/prisma";
import {
  clientIdentity,
  consumeRateLimit,
} from "@/lib/rateLimit";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { getSessionAllowingPasswordChange } from "@/lib/session";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_USER = 20;
const MAX_PER_IP = 40;
const MAX_SHARED = 80;

function isRegistrationResponse(value: unknown): value is RegistrationResponseJSON {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id: unknown }).id === "string" &&
    "response" in value
  );
}

export async function POST(req: Request) {
  if (!isAllowedRequestOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await getSessionAllowingPasswordChange();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.mustChangePassword) {
    return NextResponse.json(
      { error: "Change your temporary password before adding a passkey" },
      { status: 403 },
    );
  }

  const { ip, trusted } = clientIdentity(req);
  const userLimit = consumeRateLimit(
    `passkey:reg:user:${session.userId}`,
    MAX_PER_USER,
    WINDOW_MS,
  );
  const ipLimit = consumeRateLimit(
    `passkey:reg:ip:${ip}`,
    trusted ? MAX_PER_IP : MAX_SHARED,
    WINDOW_MS,
  );
  if (userLimit.limited || ipLimit.limited) {
    return NextResponse.json(
      { error: "Too many passkey attempts. Try again in a few minutes." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(userLimit.retryAfterSec, ipLimit.retryAfterSec),
          ),
        },
      },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, mustChangePassword: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.mustChangePassword) {
    return NextResponse.json(
      { error: "Change your temporary password before adding a passkey" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const attestation =
    typeof body === "object" && body && "attestation" in body
      ? (body as { attestation: unknown }).attestation
      : body;
  const name =
    typeof body === "object" &&
    body &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string"
      ? (body as { name: string }).name
      : null;

  if (!isRegistrationResponse(attestation)) {
    return NextResponse.json({ error: "Invalid passkey response" }, { status: 400 });
  }

  const result = await verifyAndStoreRegistration(user.id, attestation, name);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAction(user.id, "PASSKEY_REGISTERED", "Passkey", result.passkey.id);

  return NextResponse.json(
    { success: true, passkey: toPublicPasskey(result.passkey) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
