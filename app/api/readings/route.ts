import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  aggregateScore,
  scoreHeartRate,
  scoreSpo2,
  scoreSystolic,
  scoreTemp,
} from "@/lib/vitalScore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function asOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function alertTypesForReading(vitals: {
  heartRate?: number;
  spo2?: number;
  systolic?: number;
  tempC?: number;
}): string[] {
  const types: string[] = [];

  if (vitals.heartRate != null && scoreHeartRate(vitals.heartRate) > 0) {
    types.push(vitals.heartRate >= 91 ? "HIGH_HR" : "LOW_HR");
  }
  if (vitals.spo2 != null && scoreSpo2(vitals.spo2) > 0) {
    types.push("LOW_SPO2");
  }
  if (vitals.systolic != null && scoreSystolic(vitals.systolic) > 0) {
    types.push(vitals.systolic >= 220 ? "HIGH_SYSTOLIC" : "LOW_SYSTOLIC");
  }
  if (vitals.tempC != null && scoreTemp(vitals.tempC) > 0) {
    types.push(vitals.tempC >= 38.1 ? "HIGH_TEMP" : "LOW_TEMP");
  }

  return types;
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

    const now = new Date();

    const reading = await prisma.reading.create({
      data: {
        deviceId: device.id,
        heartRate: heartRate ?? null,
        spo2: spo2 ?? null,
        tempC: tempC ?? null,
        systolic: systolic ?? null,
        diastolic: diastolic ?? null,
        recordedAt: now,
      },
    });

    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeen: now },
    });

    const scoreInput = {
      ...(heartRate !== undefined ? { heartRate } : {}),
      ...(spo2 !== undefined ? { spo2 } : {}),
      ...(systolic !== undefined ? { systolic } : {}),
      ...(tempC !== undefined ? { tempC } : {}),
    };

    const score = aggregateScore(scoreInput);

    if (score.level === "URGENT" || score.level === "LOW") {
      const types = alertTypesForReading(scoreInput);
      for (const alertType of types) {
        await prisma.alert.create({
          data: {
            deviceId: device.id,
            readingId: reading.id,
            alertType,
          },
        });
      }
    }

    await logAction(
      null,
      "DEVICE_READING_INGESTED",
      "Reading",
      reading.id,
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
