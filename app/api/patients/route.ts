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
    include: { ward: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (!canManagePatientsInWard(session, room.wardId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const patient = await prisma.patient.create({
      data: {
        roomId,
        fullName: fullName.trim(),
        patientCode: patientCode.trim().toUpperCase(),
      },
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
