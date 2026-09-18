import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name =
    typeof body === "object" && body && "name" in body
      ? String((body as { name: unknown }).name ?? "").trim()
      : "";
  const institution =
    typeof body === "object" && body && "institution" in body
      ? String((body as { institution: unknown }).institution ?? "").trim()
      : "";
  const message =
    typeof body === "object" && body && "message" in body
      ? String((body as { message: unknown }).message ?? "").trim()
      : "";

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
