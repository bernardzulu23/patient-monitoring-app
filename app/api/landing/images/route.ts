import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import {
  ALLOWED_MIME,
  isLandingSlot,
  listLandingImagesMeta,
  MAX_IMAGE_BYTES,
} from "@/lib/landing";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const images = await listLandingImagesMeta();
  return NextResponse.json({ images });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const slotRaw = String(form.get("slot") ?? "");
  const file = form.get("file");

  if (!isLandingSlot(slotRaw)) {
    return NextResponse.json(
      { error: "Slot must be HERO or GALLERY" },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, or GIF allowed" },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image must be under 1.5 MB" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Keep a single hero — replace previous hero images
  if (slotRaw === "HERO") {
    await prisma.landingImage.deleteMany({ where: { slot: "HERO" } });
  }

  const image = await prisma.landingImage.create({
    data: {
      slot: slotRaw,
      fileName: file.name.slice(0, 180) || "upload",
      mimeType: file.type,
      data: buffer,
      uploadedById: session.userId,
    },
    select: {
      id: true,
      slot: true,
      fileName: true,
      mimeType: true,
      createdAt: true,
    },
  });

  await logAction(
    session.userId,
    "LANDING_IMAGE_UPLOADED",
    "LandingImage",
    image.id,
  );

  return NextResponse.json({ image });
}
