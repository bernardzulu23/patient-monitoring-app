import { NextResponse } from "next/server";
import { canManagePatientsInWard } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** Soft-discharge: archive patient, free bed, unassign devices from patient. */
export async function POST(
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
    include: { room: true, devices: true },
  });

  if (!patient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canManagePatientsInWard(session, patient.room.wardId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (patient.status === "DISCHARGED") {
    return NextResponse.json({ error: "Already discharged" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.device.updateMany({
      where: { patientId },
      data: { patientId: null },
    }),
    prisma.patient.update({
      where: { id: patientId },
      data: {
        status: "DISCHARGED",
        dischargedAt: new Date(),
      },
    }),
  ]);

  await logAction(session.userId, "DISCHARGED_PATIENT", "Patient", patientId);

  return NextResponse.json({ success: true });
}
