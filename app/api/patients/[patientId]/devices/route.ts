import { canManagePatientsInWard } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export async function POST(
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

  const body = await req.json().catch(() => ({}));
  const deviceName =
    typeof body.deviceName === "string" && body.deviceName.trim()
      ? body.deviceName.trim()
      : `ESP32-${patient.patientCode}`;

  const apiKey = `dev_${randomUUID()}`;

  const device = await prisma.device.create({
    data: {
      patientId,
      deviceName,
      apiKey,
    },
  });

  // apiKey returned once — never exposed again via list endpoints
  return NextResponse.json(
    {
      device: {
        id: device.id,
        deviceName: device.deviceName,
        apiKey,
      },
    },
    { status: 201 },
  );
}
