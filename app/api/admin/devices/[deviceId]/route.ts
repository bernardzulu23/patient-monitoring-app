import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** Remap device to a different bed. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { deviceId } = await params;
  const body = await req.json().catch(() => ({}));
  const roomId = body.roomId;

  if (typeof roomId !== "string" || !roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { patients: { where: { status: "ACTIVE" }, take: 1 } },
  });
  if (!room) {
    return NextResponse.json({ error: "Bed not found" }, { status: 404 });
  }

  const device = await prisma.device.update({
    where: { id: deviceId },
    data: {
      roomId,
      patientId: room.patients[0]?.id ?? null,
    },
  });

  await logAction(session.userId, "REMAPPED_DEVICE", "Device", deviceId);
  return NextResponse.json({ device: { id: device.id, roomId: device.roomId } });
}
