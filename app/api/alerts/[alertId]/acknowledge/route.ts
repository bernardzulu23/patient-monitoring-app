import { canAccessWard, canManagePatientsInWard, isAdmin, isDoctor } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ alertId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { alertId } = await params;
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: {
      device: {
        include: {
          room: true,
          patient: { include: { room: true } },
        },
      },
    },
  });

  if (!alert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const wardId =
    alert.device.room?.wardId ?? alert.device.patient?.room.wardId;
  if (!wardId || !canAccessWard(session, wardId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed =
    isAdmin(session) ||
    isDoctor(session) ||
    canManagePatientsInWard(session, wardId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (alert.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Only ACTIVE alerts can be acknowledged" },
      { status: 400 },
    );
  }

  const updated = await prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      acknowledgedById: session.userId,
    },
  });

  await logAction(session.userId, "ACKNOWLEDGED_ALERT", "Alert", alertId);

  return NextResponse.json({ alert: updated });
}
