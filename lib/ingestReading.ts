import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  aggregateScore,
  scoreHeartRate,
  scoreSpo2,
  scoreSystolic,
  scoreTemp,
  type ScoreLevel,
} from "@/lib/vitalScore";

export type VitalsInput = {
  heartRate?: number;
  spo2?: number;
  tempC?: number;
  systolic?: number;
  diastolic?: number;
  recordedAt?: Date;
};

/** Device counts as online if lastSeen within this window (~5 min for demos). */
export const ONLINE_MS = 5 * 60_000;

export type MonitorStatus = "NO_DATA" | "OFFLINE" | ScoreLevel;

export function alertTypesForReading(vitals: {
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

/** Resolve display status from device + latest reading. */
export function resolveMonitorStatus(args: {
  hasDevice: boolean;
  lastSeen: Date | null | undefined;
  reading: {
    heartRate?: number | null;
    spo2?: number | null;
    systolic?: number | null;
    tempC?: number | null;
  } | null;
}): { status: MonitorStatus; scoreTotal: number; online: boolean } {
  const online = Boolean(
    args.lastSeen && Date.now() - args.lastSeen.getTime() < ONLINE_MS,
  );

  if (!args.hasDevice || !args.reading) {
    return { status: "NO_DATA", scoreTotal: 0, online };
  }

  if (!online) {
    const score = aggregateScore(args.reading);
    // Offline takes priority for triage display when device went quiet
    return { status: "OFFLINE", scoreTotal: score.total, online: false };
  }

  const score = aggregateScore(args.reading);
  return { status: score.level, scoreTotal: score.total, online: true };
}

export function formatRelativeAge(date: Date | null | undefined): string | null {
  if (!date) return null;
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return date.toLocaleDateString();
}

/**
 * Persist a reading for a known device, update lastSeen, score, create alerts, audit.
 */
export async function ingestReadingForDevice(
  deviceId: string,
  vitals: VitalsInput,
  auditUserId: string | null = null,
) {
  const {
    heartRate,
    spo2,
    tempC,
    systolic,
    diastolic,
    recordedAt = new Date(),
  } = vitals;

  const reading = await prisma.reading.create({
    data: {
      deviceId,
      heartRate: heartRate ?? null,
      spo2: spo2 ?? null,
      tempC: tempC ?? null,
      systolic: systolic ?? null,
      diastolic: diastolic ?? null,
      recordedAt,
    },
  });

  await prisma.device.update({
    where: { id: deviceId },
    data: { lastSeen: recordedAt },
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
          deviceId,
          readingId: reading.id,
          alertType,
        },
      });
    }
  }

  await logAction(
    auditUserId,
    "DEVICE_READING_INGESTED",
    "Reading",
    reading.id,
  );

  return { reading, score };
}
