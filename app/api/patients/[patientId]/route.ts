import { canManagePatientsInWard } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientId } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { room: true },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  if (!canManagePatientsInWard(session, patient.room.wardId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data: {
    fullName?: string;
    patientCode?: string;
    roomId?: string;
  } = {};

  if (typeof body.fullName === "string") {
    if (!body.fullName.trim()) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 },
      );
    }
    data.fullName = body.fullName.trim();
  }

  if (typeof body.patientCode === "string") {
    if (!body.patientCode.trim()) {
      return NextResponse.json(
        { error: "Patient code is required" },
        { status: 400 },
      );
    }
    data.patientCode = body.patientCode.trim().toUpperCase();
  }

  if (typeof body.roomId === "string" && body.roomId !== patient.roomId) {
    const targetRoom = await prisma.room.findUnique({
      where: { id: body.roomId },
    });
    if (!targetRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (!canManagePatientsInWard(session, targetRoom.wardId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Nurses can only move within their ward; admins can move across wards
    if (
      session.role === "nurse" &&
      targetRoom.wardId !== patient.room.wardId
    ) {
      return NextResponse.json(
        { error: "Nurses can only move patients within their ward" },
        { status: 403 },
      );
    }
    data.roomId = body.roomId;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  try {
    const updated = await prisma.patient.update({
      where: { id: patientId },
      data,
      include: { room: { include: { ward: true } } },
    });
    await logAction(session.userId, "UPDATED_PATIENT", "Patient", patientId);
    return NextResponse.json({ patient: updated });
  } catch {
    return NextResponse.json(
      { error: "Patient code already exists" },
      { status: 409 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientId } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      room: true,
      devices: { include: { _count: { select: { readings: true, alerts: true } } } },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  if (!canManagePatientsInWard(session, patient.room.wardId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cascade: alerts → readings → devices → patient
  const deviceIds = patient.devices.map((d) => d.id);
  if (deviceIds.length > 0) {
    await prisma.alert.deleteMany({ where: { deviceId: { in: deviceIds } } });
    await prisma.reading.deleteMany({ where: { deviceId: { in: deviceIds } } });
    await prisma.device.deleteMany({ where: { id: { in: deviceIds } } });
  }
  await prisma.patient.delete({ where: { id: patientId } });
  await logAction(session.userId, "DELETED_PATIENT", "Patient", patientId);

  return NextResponse.json({ success: true });
}
