import { NextResponse } from "next/server";
import { canManagePatientsInWard } from "@/lib/authz";
import { ingestReadingForDevice } from "@/lib/ingestReading";
import { getPatientDetail } from "@/lib/data";
import { getSession } from "@/lib/session";
import { aggregateScore } from "@/lib/vitalScore";

export const runtime = "nodejs";

function jitter(base: number, spread: number) {
  return Math.round((base + (Math.random() * 2 - 1) * spread) * 10) / 10;
}

/** Plausible vitals for demos — mild variation around normal, occasional dips. */
function generateSimulatedVitals() {
  const roll = Math.random();
  if (roll < 0.12) {
    return {
      heartRate: Math.round(118 + Math.random() * 12),
      spo2: Math.round(87 + Math.random() * 3),
      tempC: jitter(37.1, 0.3),
      systolic: Math.round(125 + Math.random() * 10),
      diastolic: Math.round(80 + Math.random() * 6),
      respiratoryRate: Math.round(26 + Math.random() * 4),
    };
  }
  if (roll < 0.3) {
    return {
      heartRate: Math.round(90 + Math.random() * 8),
      spo2: Math.round(93 + Math.random() * 2),
      tempC: jitter(37.0, 0.2),
      systolic: Math.round(120 + Math.random() * 8),
      diastolic: Math.round(78 + Math.random() * 5),
      respiratoryRate: Math.round(20 + Math.random() * 3),
    };
  }
  return {
    heartRate: Math.round(70 + Math.random() * 14),
    spo2: Math.round(97 + Math.random() * 2),
    tempC: jitter(36.7, 0.3),
    systolic: Math.round(112 + Math.random() * 14),
    diastolic: Math.round(72 + Math.random() * 8),
    respiratoryRate: Math.round(14 + Math.random() * 4),
  };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientId } = await params;
  const patient = await getPatientDetail(session, patientId);
  if (!patient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canManagePatientsInWard(session, patient.room.wardId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const device = patient.devices[0];
  if (!device) {
    return NextResponse.json(
      { error: "Patient has no device" },
      { status: 400 },
    );
  }

  const vitals = generateSimulatedVitals();
  const { reading, score } = await ingestReadingForDevice(
    device.id,
    vitals,
    session.userId,
  );

  return NextResponse.json({
    success: true,
    readingId: reading.id,
    score,
    vitals,
    computed: aggregateScore(vitals),
  });
}
