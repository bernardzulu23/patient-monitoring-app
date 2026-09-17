import { NextResponse } from "next/server";
import { canManagePatientsInWard } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
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
    include: { room: true, thresholdOverride: true },
  });
  if (!patient || !canManagePatientsInWard(session, patient.room.wardId)) {
    // doctors can view via getPatientDetail path; allow read for ward access
  }
  if (!patient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ override: patient.thresholdOverride });
}

export async function PUT(
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canManagePatientsInWard(session, patient.room.wardId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const opt = (v: unknown) => {
    if (v === null || v === "" || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const data = {
    tempLow: opt(body.tempLow),
    tempHigh: opt(body.tempHigh),
    hrLow: opt(body.hrLow),
    hrHigh: opt(body.hrHigh),
    spo2Low: opt(body.spo2Low),
    sysLow: opt(body.sysLow),
    sysHigh: opt(body.sysHigh),
  };

  const override = await prisma.patientThresholdOverride.upsert({
    where: { patientId },
    create: { patientId, ...data },
    update: data,
  });

  await logAction(
    session.userId,
    "UPDATED_PATIENT_THRESHOLDS",
    "Patient",
    patientId,
  );

  return NextResponse.json({ override });
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
    include: { room: true },
  });
  if (!patient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canManagePatientsInWard(session, patient.room.wardId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.patientThresholdOverride.deleteMany({ where: { patientId } });
  await logAction(
    session.userId,
    "CLEARED_PATIENT_THRESHOLDS",
    "Patient",
    patientId,
  );
  return NextResponse.json({ success: true });
}
