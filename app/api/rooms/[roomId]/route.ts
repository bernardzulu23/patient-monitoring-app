import { NextResponse } from "next/server";
import { canManagePatientsInWard } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const ALLOWED = new Set(["EMPTY", "OCCUPIED", "RESERVED", "CLEANING"]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { patients: { where: { status: "ACTIVE" } } },
  });
  if (!room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canManagePatientsInWard(session, room.wardId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const status = body.status;
  if (typeof status !== "string" || !ALLOWED.has(status)) {
    return NextResponse.json(
      { error: "status must be EMPTY, OCCUPIED, RESERVED, or CLEANING" },
      { status: 400 },
    );
  }

  if (status === "EMPTY" && room.patients.length > 0) {
    return NextResponse.json(
      { error: "Discharge the patient before marking empty" },
      { status: 409 },
    );
  }
  if (status === "OCCUPIED" && room.patients.length === 0) {
    return NextResponse.json(
      { error: "Admit a patient before marking occupied" },
      { status: 409 },
    );
  }

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: { status },
  });
  await logAction(session.userId, "UPDATED_BED_STATUS", "Room", roomId);
  return NextResponse.json({ room: updated });
}
