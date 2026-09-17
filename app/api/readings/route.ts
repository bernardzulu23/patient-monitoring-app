import { ingestReadingForDevice } from "@/lib/ingestReading";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function asOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Sensor-fault gates — not clinical scoring. Reject whole request if any field fails. */
const PHYSIO_RANGES: Record<string, { min: number; max: number }> = {
  heartRate: { min: 20, max: 300 },
  spo2: { min: 0, max: 100 },
  tempC: { min: 25, max: 45 },
  systolic: { min: 40, max: 300 },
  diastolic: { min: 20, max: 200 },
};

function findOutOfRangeField(
  vitals: Record<string, number | undefined>,
): { field: string; value: number } | null {
  for (const [field, range] of Object.entries(PHYSIO_RANGES)) {
    const value = vitals[field];
    if (value === undefined) continue;
    if (value < range.min || value > range.max) {
      return { field, value };
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const device = await prisma.device.findUnique({
      where: { apiKey },
      include: { patient: true },
    });

    if (!device) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "No vital signs provided" },
        { status: 400 },
      );
    }

    const raw =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};

    // Ignore any deviceId / patientId in the body — identity comes only from api key
    const heartRate = asOptionalNumber(raw.heartRate);
    const spo2 = asOptionalNumber(raw.spo2);
    const tempC = asOptionalNumber(raw.tempC);
    const systolic = asOptionalNumber(raw.systolic);
    const diastolic = asOptionalNumber(raw.diastolic);

    if (
      heartRate === undefined &&
      spo2 === undefined &&
      tempC === undefined &&
      systolic === undefined &&
      diastolic === undefined
    ) {
      return NextResponse.json(
        { error: "No vital signs provided" },
        { status: 400 },
      );
    }

    const outOfRange = findOutOfRangeField({
      heartRate,
      spo2,
      tempC,
      systolic,
      diastolic,
    });
    if (outOfRange) {
      return NextResponse.json(
        {
          error: "Reading out of physiological range",
          field: outOfRange.field,
          value: outOfRange.value,
        },
        { status: 400 },
      );
    }

    const vitals = {
      ...(heartRate !== undefined ? { heartRate } : {}),
      ...(spo2 !== undefined ? { spo2 } : {}),
      ...(tempC !== undefined ? { tempC } : {}),
      ...(systolic !== undefined ? { systolic } : {}),
      ...(diastolic !== undefined ? { diastolic } : {}),
    };

    const { reading, score } = await ingestReadingForDevice(
      device.id,
      vitals,
      null,
    );

    return NextResponse.json({
      success: true,
      readingId: reading.id,
      score,
    });
  } catch (error) {
    console.error("[api/readings]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
