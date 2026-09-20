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
    dateOfBirth?: Date | null;
    nrc?: string | null;
    residentialArea?: string | null;
    age?: number | null;
    sex?: string | null;
    admissionReason?: string | null;
    nextOfKinFullName?: string | null;
    nextOfKinResidentialArea?: string | null;
    nextOfKinPhone?: string | null;
    nextOfKinRelation?: string | null;
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

  if (body.dateOfBirth !== undefined) {
    if (body.dateOfBirth === null || body.dateOfBirth === "") {
      data.dateOfBirth = null;
      data.age = null;
    } else if (typeof body.dateOfBirth === "string") {
      const d = new Date(body.dateOfBirth);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "Invalid date of birth" },
          { status: 400 },
        );
      }
      data.dateOfBirth = d;
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
      data.age = age >= 0 && age < 150 ? age : null;
    }
  }

  if (body.nrc !== undefined) {
    data.nrc =
      typeof body.nrc === "string" && body.nrc.trim()
        ? body.nrc.trim().slice(0, 40)
        : null;
  }
  if (body.residentialArea !== undefined) {
    data.residentialArea =
      typeof body.residentialArea === "string" && body.residentialArea.trim()
        ? body.residentialArea.trim().slice(0, 180)
        : null;
  }
  if (body.nextOfKinFullName !== undefined) {
    data.nextOfKinFullName =
      typeof body.nextOfKinFullName === "string" && body.nextOfKinFullName.trim()
        ? body.nextOfKinFullName.trim().slice(0, 120)
        : null;
  }
  if (body.nextOfKinResidentialArea !== undefined) {
    data.nextOfKinResidentialArea =
      typeof body.nextOfKinResidentialArea === "string" &&
      body.nextOfKinResidentialArea.trim()
        ? body.nextOfKinResidentialArea.trim().slice(0, 180)
        : null;
  }
  if (body.nextOfKinPhone !== undefined) {
    data.nextOfKinPhone =
      typeof body.nextOfKinPhone === "string" && body.nextOfKinPhone.trim()
        ? body.nextOfKinPhone.trim().slice(0, 40)
        : null;
  }
  if (body.nextOfKinRelation !== undefined) {
    data.nextOfKinRelation =
      typeof body.nextOfKinRelation === "string" && body.nextOfKinRelation.trim()
        ? body.nextOfKinRelation.trim().slice(0, 60)
        : null;
  }

  if (body.age !== undefined && data.age === undefined) {
    if (body.age === null || body.age === "") data.age = null;
    else {
      const n = Number(body.age);
      data.age = Number.isFinite(n) ? n : null;
    }
  }
  if (body.sex !== undefined) {
    data.sex =
      typeof body.sex === "string" && body.sex.trim()
        ? body.sex.trim().slice(0, 20)
        : null;
  }
  if (body.admissionReason !== undefined) {
    data.admissionReason =
      typeof body.admissionReason === "string" && body.admissionReason.trim()
        ? body.admissionReason.trim().slice(0, 500)
        : null;
  }

  if (typeof body.roomId === "string" && body.roomId !== patient.roomId) {
    const targetRoom = await prisma.room.findUnique({
      where: { id: body.roomId },
      include: { patients: { where: { status: "ACTIVE" } } },
    });
    if (!targetRoom) {
      return NextResponse.json({ error: "Bed not found" }, { status: 404 });
    }
    if (!canManagePatientsInWard(session, targetRoom.wardId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      session.role === "nurse" &&
      targetRoom.wardId !== patient.room.wardId
    ) {
      return NextResponse.json(
        { error: "Nurses can only move patients within their ward" },
        { status: 403 },
      );
    }
    if (
      targetRoom.patients.some((p) => p.id !== patientId) &&
      targetRoom.patients.length > 0
    ) {
      return NextResponse.json(
        { error: "Target bed already has an active patient" },
        { status: 409 },
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
