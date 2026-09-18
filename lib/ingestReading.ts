import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  evaluateThresholdBreaches,
  getEffectiveThresholds,
} from "@/lib/thresholds";
import {
  aggregateScore,
  type ScoreLevel,
} from "@/lib/vitalScore";

export type VitalsInput = {
  heartRate?: number;
  spo2?: number;
  tempC?: number;
  systolic?: number;
  diastolic?: number;
  respiratoryRate?: number;
  recordedAt?: Date;
};

/** Continuous vitals: online / offline display window (2 min per plan). */
export const ONLINE_MS = 2 * 60_000;
export const DEVICE_OFFLINE_MS = 2 * 60_000;

export type MonitorStatus = "NO_DATA" | "OFFLINE" | ScoreLevel;

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

async function upsertActiveAlert(args: {
  deviceId: string;
  readingId: string | null;
  alertType: string;
  value: number | null;
}) {
  const existing = await prisma.alert.findFirst({
    where: {
      deviceId: args.deviceId,
      alertType: args.alertType,
      status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    await prisma.alert.update({
      where: { id: existing.id },
      data: {
        readingId: args.readingId ?? existing.readingId,
        value: args.value,
      },
    });
    return existing.id;
  }

  const created = await prisma.alert.create({
    data: {
      deviceId: args.deviceId,
      readingId: args.readingId,
      alertType: args.alertType,
      status: "ACTIVE",
      value: args.value,
    },
  });
  return created.id;
}

async function resolveOpenAlerts(
  deviceId: string,
  alertTypes: string[],
) {
  if (alertTypes.length === 0) return;
  await prisma.alert.updateMany({
    where: {
      deviceId,
      alertType: { in: alertTypes },
      status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
    },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
  });
}

/** Create/resolve DEVICE_OFFLINE based on lastSeen. */
export async function syncDeviceOfflineAlert(deviceId: string) {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) return;

  const offline =
    !device.lastSeen ||
    Date.now() - device.lastSeen.getTime() > DEVICE_OFFLINE_MS;

  if (offline) {
    await upsertActiveAlert({
      deviceId,
      readingId: null,
      alertType: "DEVICE_OFFLINE",
      value: null,
    });
  } else {
    await resolveOpenAlerts(deviceId, ["DEVICE_OFFLINE"]);
  }
}

/**
 * Persist a reading for a known device, update lastSeen, score, threshold alerts, audit.
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
    respiratoryRate,
    recordedAt = new Date(),
  } = vitals;

  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { id: true, patientId: true },
  });
  if (!device) {
    throw new Error("Device not found");
  }

  const reading = await prisma.reading.create({
    data: {
      deviceId,
      heartRate: heartRate ?? null,
      spo2: spo2 ?? null,
      tempC: tempC ?? null,
      systolic: systolic ?? null,
      diastolic: diastolic ?? null,
      respiratoryRate: respiratoryRate ?? null,
      recordedAt,
    },
  });

  await prisma.device.update({
    where: { id: deviceId },
    data: { lastSeen: recordedAt },
  });

  await resolveOpenAlerts(deviceId, ["DEVICE_OFFLINE"]);

  const scoreInput = {
    ...(heartRate !== undefined ? { heartRate } : {}),
    ...(spo2 !== undefined ? { spo2 } : {}),
    ...(systolic !== undefined ? { systolic } : {}),
    ...(tempC !== undefined ? { tempC } : {}),
  };

  const score = aggregateScore(scoreInput);

  const thresholds = await getEffectiveThresholds(device.patientId);
  const breaches = evaluateThresholdBreaches(
    {
      heartRate: heartRate ?? null,
      spo2: spo2 ?? null,
      tempC: tempC ?? null,
      systolic: systolic ?? null,
      respiratoryRate: respiratoryRate ?? null,
    },
    thresholds,
  );

  const allThreshTypes = [
    "THRESH_LOW_TEMP",
    "THRESH_HIGH_TEMP",
    "THRESH_LOW_HR",
    "THRESH_HIGH_HR",
    "THRESH_LOW_SPO2",
    "THRESH_LOW_SYSTOLIC",
    "THRESH_HIGH_SYSTOLIC",
    "THRESH_LOW_RR",
    "THRESH_HIGH_RR",
  ];
  const activeTypes = new Set(breaches.map((b) => b.alertType));
  const toResolve = allThreshTypes.filter((t) => !activeTypes.has(t));
  await resolveOpenAlerts(deviceId, toResolve);

  for (const breach of breaches) {
    await upsertActiveAlert({
      deviceId,
      readingId: reading.id,
      alertType: breach.alertType,
      value: breach.value,
    });
  }

  await logAction(
    auditUserId,
    "DEVICE_READING_INGESTED",
    "Reading",
    reading.id,
  );

  return { reading, score, breaches };
}
