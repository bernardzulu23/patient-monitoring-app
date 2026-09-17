import { getSession, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccessWard, canViewAllWards } from "@/lib/authz";
import {
  formatRelativeAge,
  ONLINE_MS,
  resolveMonitorStatus,
  type MonitorStatus,
} from "@/lib/ingestReading";
import { aggregateScore, type ScoreLevel } from "@/lib/vitalScore";
import { redirect } from "next/navigation";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function wardsWhereForSession(session: SessionPayload) {
  if (canViewAllWards(session)) return {};
  if (session.wardId) return { id: session.wardId };
  return { id: "__none__" };
}

function worstMonitorStatus(statuses: MonitorStatus[]): MonitorStatus {
  if (statuses.includes("URGENT")) return "URGENT";
  if (statuses.includes("LOW")) return "LOW";
  if (statuses.includes("OFFLINE")) return "OFFLINE";
  if (statuses.includes("NO_DATA")) return "NO_DATA";
  if (statuses.includes("NORMAL")) return "NORMAL";
  return "NO_DATA";
}

export type AttentionPatient = {
  id: string;
  fullName: string;
  patientCode: string;
  wardId: string;
  wardName: string;
  roomId: string;
  roomNumber: string;
  status: MonitorStatus;
  scoreTotal: number;
  lastReadingAge: string | null;
};

export type WardSummary = {
  id: string;
  name: string;
  patientCount: number;
  roomCount: number;
  openAlerts: number;
  scoreLevel: MonitorStatus;
  onlineDevices: number;
  deviceCount: number;
  offlineDevices: number;
  urgentCount: number;
  lowCount: number;
  lastReadingAge: string | null;
};

export type DashboardOverview = {
  wards: WardSummary[];
  attention: AttentionPatient[];
  totals: {
    urgent: number;
    low: number;
    offline: number;
    online: number;
    openAlerts: number;
  };
};

export async function getDashboardOverview(
  session: SessionPayload,
): Promise<DashboardOverview> {
  const wards = await prisma.ward.findMany({
    where: wardsWhereForSession(session),
    orderBy: { name: "asc" },
    include: {
      rooms: {
        include: {
          patients: {
            include: {
              devices: {
                include: {
                  readings: {
                    orderBy: { recordedAt: "desc" },
                    take: 1,
                  },
                  alerts: {
                    where: {
                      createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const attention: AttentionPatient[] = [];
  let totalUrgent = 0;
  let totalLow = 0;
  let totalOffline = 0;
  let totalOnline = 0;
  let totalOpenAlerts = 0;

  const wardSummaries: WardSummary[] = wards.map((ward) => {
    const patients = ward.rooms.flatMap((r) =>
      r.patients.map((p) => ({ patient: p, room: r })),
    );
    const statuses: MonitorStatus[] = [];
    let onlineDevices = 0;
    let offlineDevices = 0;
    let deviceCount = 0;
    let urgentCount = 0;
    let lowCount = 0;
    let openAlerts = 0;
    let latestReadingAt: Date | null = null;

    for (const { patient, room } of patients) {
      const device = patient.devices[0];
      const reading = device?.readings[0] ?? null;
      openAlerts += device?.alerts.length ?? 0;

      if (reading && (!latestReadingAt || reading.recordedAt > latestReadingAt)) {
        latestReadingAt = reading.recordedAt;
      }

      const resolved = resolveMonitorStatus({
        hasDevice: Boolean(device),
        lastSeen: device?.lastSeen,
        reading,
      });
      statuses.push(resolved.status);

      if (device) {
        deviceCount += 1;
        if (resolved.online) onlineDevices += 1;
        else offlineDevices += 1;
      }

      if (resolved.status === "URGENT") {
        urgentCount += 1;
        attention.push({
          id: patient.id,
          fullName: patient.fullName,
          patientCode: patient.patientCode,
          wardId: ward.id,
          wardName: ward.name,
          roomId: room.id,
          roomNumber: room.number,
          status: "URGENT",
          scoreTotal: resolved.scoreTotal,
          lastReadingAge: formatRelativeAge(reading?.recordedAt),
        });
      } else if (resolved.status === "LOW") {
        lowCount += 1;
        attention.push({
          id: patient.id,
          fullName: patient.fullName,
          patientCode: patient.patientCode,
          wardId: ward.id,
          wardName: ward.name,
          roomId: room.id,
          roomNumber: room.number,
          status: "LOW",
          scoreTotal: resolved.scoreTotal,
          lastReadingAge: formatRelativeAge(reading?.recordedAt),
        });
      } else if (resolved.status === "OFFLINE") {
        attention.push({
          id: patient.id,
          fullName: patient.fullName,
          patientCode: patient.patientCode,
          wardId: ward.id,
          wardName: ward.name,
          roomId: room.id,
          roomNumber: room.number,
          status: "OFFLINE",
          scoreTotal: resolved.scoreTotal,
          lastReadingAge: formatRelativeAge(reading?.recordedAt),
        });
      }
    }

    totalUrgent += urgentCount;
    totalLow += lowCount;
    totalOffline += offlineDevices;
    totalOnline += onlineDevices;
    totalOpenAlerts += openAlerts;

    return {
      id: ward.id,
      name: ward.name,
      patientCount: patients.length,
      roomCount: ward.rooms.length,
      openAlerts,
      scoreLevel: worstMonitorStatus(statuses),
      onlineDevices,
      deviceCount,
      offlineDevices,
      urgentCount,
      lowCount,
      lastReadingAge: formatRelativeAge(latestReadingAt),
    };
  });

  attention.sort((a, b) => {
    const rank = (s: MonitorStatus) =>
      s === "URGENT" ? 0 : s === "LOW" ? 1 : s === "OFFLINE" ? 2 : 3;
    return rank(a.status) - rank(b.status);
  });

  return {
    wards: wardSummaries,
    attention,
    totals: {
      urgent: totalUrgent,
      low: totalLow,
      offline: totalOffline,
      online: totalOnline,
      openAlerts: totalOpenAlerts,
    },
  };
}

/** @deprecated use getDashboardOverview — kept for gradual call-site migration */
export async function getWardOverview(session: SessionPayload) {
  const { wards } = await getDashboardOverview(session);
  return wards;
}

export async function getWardWithRooms(session: SessionPayload, wardId: string) {
  if (!canAccessWard(session, wardId)) return null;

  return prisma.ward.findFirst({
    where: { id: wardId },
    include: {
      rooms: {
        orderBy: { number: "asc" },
        include: {
          _count: { select: { patients: true } },
        },
      },
    },
  });
}

export async function getRoomDetail(
  session: SessionPayload,
  wardId: string,
  roomId: string,
) {
  if (!canAccessWard(session, wardId)) return null;

  return prisma.room.findFirst({
    where: { id: roomId, wardId },
    include: {
      ward: true,
      patients: {
        orderBy: { fullName: "asc" },
        include: {
          devices: {
            include: {
              readings: { orderBy: { recordedAt: "desc" }, take: 1 },
            },
          },
        },
      },
    },
  });
}

export async function getPatientDetail(
  session: SessionPayload,
  patientId: string,
) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      room: { include: { ward: true } },
      devices: {
        include: {
          readings: { orderBy: { recordedAt: "desc" }, take: 60 },
          alerts: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
    },
  });

  if (!patient) return null;
  if (!canAccessWard(session, patient.room.wardId)) return null;
  return patient;
}

export function serializePatientDetail(
  patient: NonNullable<Awaited<ReturnType<typeof getPatientDetail>>>,
) {
  const device = patient.devices[0];
  const readings = device?.readings ?? [];
  const alerts = device?.alerts ?? [];
  const latest = readings[0] ?? null;
  const resolved = resolveMonitorStatus({
    hasDevice: Boolean(device),
    lastSeen: device?.lastSeen,
    reading: latest,
  });
  const latestScore = latest ? aggregateScore(latest) : null;

  return {
    id: patient.id,
    fullName: patient.fullName,
    patientCode: patient.patientCode,
    admittedAt: patient.admittedAt.toISOString(),
    roomId: patient.roomId,
    wardId: patient.room.wardId,
    wardName: patient.room.ward.name,
    roomNumber: patient.room.number,
    deviceName: device?.deviceName ?? null,
    deviceId: device?.id ?? null,
    lastSeen: device?.lastSeen?.toISOString() ?? null,
    lastSeenAge: formatRelativeAge(device?.lastSeen),
    status: resolved.status,
    online: resolved.online,
    latestScore,
    latest: latest
      ? {
          heartRate: latest.heartRate,
          spo2: latest.spo2,
          tempC: latest.tempC,
          systolic: latest.systolic,
          diastolic: latest.diastolic,
          recordedAt: latest.recordedAt.toISOString(),
          recordedAge: formatRelativeAge(latest.recordedAt),
        }
      : null,
    readings: readings.map((r) => ({
      id: r.id,
      heartRate: r.heartRate,
      spo2: r.spo2,
      tempC: r.tempC,
      systolic: r.systolic,
      diastolic: r.diastolic,
      recordedAt: r.recordedAt.toISOString(),
      score: aggregateScore(r),
    })),
    alerts: alerts.map((a) => ({
      id: a.id,
      alertType: a.alertType,
      createdAt: a.createdAt.toISOString(),
      createdAge: formatRelativeAge(a.createdAt),
    })),
  };
}

export async function suggestNextPatientCode() {
  const latest = await prisma.patient.findMany({
    select: { patientCode: true },
    orderBy: { patientCode: "desc" },
    take: 50,
  });

  let max = 0;
  for (const row of latest) {
    const m = /^P-(\d+)$/i.exec(row.patientCode);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `P-${String(max + 1).padStart(4, "0")}`;
}

export { ONLINE_MS };
export type { MonitorStatus, ScoreLevel };
