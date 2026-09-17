import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

/** Public: serve a landing image by id. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await prisma.landingImage.findUnique({ where: { id } });
  if (!image) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.data), {
    status: 200,
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      "Content-Disposition": `inline; filename="${image.fileName.replace(/"/g, "")}"`,
    },
  });
}

/** Admin-only delete. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.landingImage.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.landingImage.delete({ where: { id } });
  await logAction(
    session.userId,
    "LANDING_IMAGE_DELETED",
    "LandingImage",
    id,
  );

  return NextResponse.json({ success: true });
}
