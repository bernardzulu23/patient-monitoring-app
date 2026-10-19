import { buildRegistrationOptions } from "@/lib/passkey";
import { prisma } from "@/lib/prisma";
import {
  clientIdentity,
  consumeRateLimit,
} from "@/lib/rateLimit";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { getSessionAllowingPasswordChange } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_USER = 20;
const MAX_PER_IP = 40;
const MAX_SHARED = 80;

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
    select: {
      id: true,
      email: true,
      displayName: true,
      mustChangePassword: true,
    },
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

  const options = await buildRegistrationOptions(user);
  return NextResponse.json(options, {
    headers: { "Cache-Control": "no-store" },
  });
}
