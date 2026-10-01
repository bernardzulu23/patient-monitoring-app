import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIdentity, consumeRateLimit } from "@/lib/rateLimit";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";

export const runtime = "nodejs";

const CONTACT_WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP = 5;
const MAX_SHARED = 30;

export async function POST(req: Request) {
  if (!isAllowedRequestOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ip, trusted } = clientIdentity(req);
  const limit = consumeRateLimit(
    `contact:ip:${ip}`,
    trusted ? MAX_PER_IP : MAX_SHARED,
    CONTACT_WINDOW_MS,
  );
  if (limit.limited) {
    return NextResponse.json(
      { error: "Too many messages. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const field = (key: string) =>
    typeof body === "object" &&
    body &&
    key in body &&
    typeof (body as Record<string, unknown>)[key] === "string"
      ? ((body as Record<string, string>)[key] ?? "").trim()
      : "";

  const name = field("name");
  const institution = field("institution");
  const message = field("message");

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!institution || institution.length > 180) {
    return NextResponse.json(
      { error: "Institution is required" },
      { status: 400 },
    );
  }
  if (!message || message.length > 4000) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  await prisma.contactMessage.create({
    data: { name, institution, message },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
