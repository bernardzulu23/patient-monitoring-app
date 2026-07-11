import { canManageWards } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ wardId: string }> },
) {
  const session = await getSession();
  if (!session || !canManageWards(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { wardId } = await params;
  const { name } = await req.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Ward name is required" }, { status: 400 });
  }

  const ward = await prisma.ward.update({
    where: { id: wardId },
    data: { name: name.trim() },
  });

  await logAction(session.userId, "RENAMED_WARD", "Ward", ward.id);

  return NextResponse.json({ ward });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ wardId: string }> },
) {
  const session = await getSession();
  if (!session || !canManageWards(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { wardId } = await params;

  const rooms = await prisma.room.count({ where: { wardId } });
  if (rooms > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete ward while it still has rooms. Remove rooms first.",
      },
      { status: 409 },
    );
  }

  await prisma.ward.delete({ where: { id: wardId } });
  await logAction(session.userId, "DELETED_WARD", "Ward", wardId);

  return NextResponse.json({ success: true });
}
