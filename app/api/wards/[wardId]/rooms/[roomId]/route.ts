import { canManageWards } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ wardId: string; roomId: string }> },
) {
  const session = await getSession();
  if (!session || !canManageWards(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { wardId, roomId } = await params;
  const room = await prisma.room.findFirst({
    where: { id: roomId, wardId },
    include: { _count: { select: { patients: true } } },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room._count.patients > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete room while it still has patients. Reassign or discharge patients first.",
      },
      { status: 409 },
    );
  }

  await prisma.room.delete({ where: { id: roomId } });
  await logAction(session.userId, "DELETED_ROOM", "Room", roomId);

  return NextResponse.json({ success: true });
}
