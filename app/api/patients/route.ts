import { canManagePatientsInWard } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

function optionalString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function parseDob(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function ageFromDob(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const roomId = body.roomId;
  const fullName = body.fullName;
  const patientCode = body.patientCode;

  if (typeof roomId !== "string" || !roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }
  if (typeof fullName !== "string" || !fullName.trim()) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }
  if (typeof patientCode !== "string" || !patientCode.trim()) {
    return NextResponse.json(
      { error: "Patient code is required" },
      { status: 400 },
    );
  }

  const dateOfBirth = parseDob(body.dateOfBirth);
  if (body.dateOfBirth && dateOfBirth === null) {
    return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
  }

  const nrc = optionalString(body.nrc, 40);
  const residentialArea = optionalString(body.residentialArea, 180);
  if (!nrc) {
    return NextResponse.json({ error: "NRC is required" }, { status: 400 });
  }
  if (!residentialArea) {
    return NextResponse.json(
      { error: "Residential area is required" },
      { status: 400 },
    );
  }

  const nextOfKinFullName = optionalString(body.nextOfKinFullName, 120);
  const nextOfKinResidentialArea = optionalString(
    body.nextOfKinResidentialArea,
    180,
  );
  const nextOfKinPhone = optionalString(body.nextOfKinPhone, 40);
  const nextOfKinRelation = optionalString(body.nextOfKinRelation, 60);
  if (!nextOfKinFullName) {
    return NextResponse.json(
      { error: "Next of kin full name is required" },
      { status: 400 },
    );
  }
  if (!nextOfKinPhone) {
    return NextResponse.json(
      { error: "Next of kin phone number is required" },
      { status: 400 },
    );
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { ward: true, patients: { where: { status: "ACTIVE" } } },
  });
  if (!room) {
    return NextResponse.json({ error: "Bed not found" }, { status: 404 });
  }

  if (!canManagePatientsInWard(session, room.wardId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (room.patients.length > 0 || room.status === "RESERVED") {
    return NextResponse.json(
      {
        error:
          room.status === "RESERVED"
            ? "This bed is reserved"
            : "This bed already has an active patient",
      },
      { status: 409 },
    );
  }

  if (room.status === "CLEANING") {
    return NextResponse.json(
      { error: "This bed is marked cleaning — set status to empty first" },
      { status: 409 },
    );
  }

  const sex =
    typeof body.sex === "string" && body.sex.trim()
      ? body.sex.trim().slice(0, 20)
      : null;
  const admissionReason =
    typeof body.admissionReason === "string" && body.admissionReason.trim()
      ? body.admissionReason.trim().slice(0, 500)
      : null;

  let admittingDoctorId: string | null = null;
  let assignedNurseId: string | null = null;
  if (typeof body.admittingDoctorId === "string" && body.admittingDoctorId) {
    const doc = await prisma.user.findFirst({
      where: { id: body.admittingDoctorId, role: "doctor" },
    });
    if (!doc) {
      return NextResponse.json({ error: "Invalid doctor" }, { status: 400 });
    }
    admittingDoctorId = doc.id;
  }
  if (typeof body.assignedNurseId === "string" && body.assignedNurseId) {
    const nurse = await prisma.user.findFirst({
      where: { id: body.assignedNurseId, role: "nurse" },
    });
    if (!nurse) {
      return NextResponse.json({ error: "Invalid nurse" }, { status: 400 });
    }
    assignedNurseId = nurse.id;
  }

  const dob = dateOfBirth === undefined ? null : dateOfBirth;
  const age = ageFromDob(dob);

  try {
    const patient = await prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          roomId,
          fullName: fullName.trim(),
          patientCode: patientCode.trim().toUpperCase(),
          dateOfBirth: dob,
          nrc,
          residentialArea,
          age,
          sex,
          admissionReason,
          nextOfKinFullName,
          nextOfKinResidentialArea,
          nextOfKinPhone,
          nextOfKinRelation,
          status: "ACTIVE",
          admittingDoctorId,
          assignedNurseId,
        },
      });
      await tx.room.update({
        where: { id: roomId },
        data: { status: "OCCUPIED" },
      });
      await tx.device.updateMany({
        where: { roomId, patientId: null },
        data: { patientId: created.id },
      });
      return created;
    });

    await logAction(session.userId, "CREATED_PATIENT", "Patient", patient.id);
    return NextResponse.json({ patient }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Patient code already exists" },
      { status: 409 },
    );
  }
}
