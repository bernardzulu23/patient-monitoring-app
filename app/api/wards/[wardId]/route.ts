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
  const body = await req.json();
  const data: {
    name?: string;
    department?: string | null;
    bedCapacity?: number | null;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (body.department !== undefined) {
    data.department =
      typeof body.department === "string" && body.department.trim()
        ? body.department.trim().slice(0, 120)
        : null;
  }
  if (body.bedCapacity !== undefined) {
    if (body.bedCapacity === null || body.bedCapacity === "") {
      data.bedCapacity = null;
    } else {
      const n = Number(body.bedCapacity);
      data.bedCapacity = Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const ward = await prisma.ward.update({
    where: { id: wardId },
    data,
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
