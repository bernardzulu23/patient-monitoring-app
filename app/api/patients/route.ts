import { canManagePatientsInWard } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

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

  if (room.patients.length > 0) {
    return NextResponse.json(
      { error: "This bed already has an active patient" },
      { status: 409 },
    );
  }

  const age =
    body.age === null || body.age === undefined || body.age === ""
      ? null
      : Number(body.age);
  const sex =
    typeof body.sex === "string" && body.sex.trim()
      ? body.sex.trim().slice(0, 20)
      : null;
  const admissionReason =
    typeof body.admissionReason === "string" && body.admissionReason.trim()
      ? body.admissionReason.trim().slice(0, 500)
      : null;

  try {
    const patient = await prisma.patient.create({
      data: {
        roomId,
        fullName: fullName.trim(),
        patientCode: patientCode.trim().toUpperCase(),
        age: Number.isFinite(age as number) ? (age as number) : null,
        sex,
        admissionReason,
        status: "ACTIVE",
      },
    });

    // Attach any bed-registered devices to this patient
    await prisma.device.updateMany({
      where: { roomId, patientId: null },
      data: { patientId: patient.id },
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
