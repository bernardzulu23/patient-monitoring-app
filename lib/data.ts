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
  department: string | null;
  bedCapacity: number | null;
  patientCount: number;
  roomCount: number;
  occupancyPercent: number | null;
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
    activePatients: number;
    occupancyPercent: number | null;
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
            where: { status: "ACTIVE" },
            include: {
              devices: {
                include: {
                  readings: {
                    orderBy: { recordedAt: "desc" },
                    take: 1,
                  },
                  alerts: {
                    where: {
                      status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
                    },
                  },
                },
              },
            },
          },
          devices: {
            include: {
              readings: { orderBy: { recordedAt: "desc" }, take: 1 },
              alerts: {
                where: { status: { in: ["ACTIVE", "ACKNOWLEDGED"] } },
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
  let totalActivePatients = 0;
  let totalCapacityBeds = 0;

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

    const capacity = ward.bedCapacity ?? ward.rooms.length;
    totalCapacityBeds += capacity;
    totalActivePatients += patients.length;
    const occupancyPercent =
      capacity > 0 ? Math.round((patients.length / capacity) * 100) : null;

    totalUrgent += urgentCount;
    totalLow += lowCount;
    totalOffline += offlineDevices;
    totalOnline += onlineDevices;
    totalOpenAlerts += openAlerts;

    return {
      id: ward.id,
      name: ward.name,
      department: ward.department,
      bedCapacity: ward.bedCapacity,
      patientCount: patients.length,
      roomCount: ward.rooms.length,
      occupancyPercent,
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

  const overallOccupancy =
    totalCapacityBeds > 0
      ? Math.round((totalActivePatients / totalCapacityBeds) * 100)
      : null;

  return {
    wards: wardSummaries,
    attention,
    totals: {
      urgent: totalUrgent,
      low: totalLow,
      offline: totalOffline,
      online: totalOnline,
      openAlerts: totalOpenAlerts,
      activePatients: totalActivePatients,
      occupancyPercent: overallOccupancy,
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
          _count: {
            select: { patients: { where: { status: "ACTIVE" } } },
          },
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
        where: { status: "ACTIVE" },
        orderBy: { fullName: "asc" },
        include: {
          devices: {
            include: {
              readings: { orderBy: { recordedAt: "desc" }, take: 1 },
            },
          },
        },
      },
      devices: true,
    },
  });
}

export type BedCard = {
  roomId: string;
  roomNumber: string;
  wardId: string;
  wardName: string;
  bedStatus: string;
  occupancy: "occupied" | "empty";
  patientId: string | null;
  patientName: string | null;
  patientCode: string | null;
  age: number | null;
  sex: string | null;
  status: MonitorStatus;
  scoreTotal: number;
  online: boolean;
  hasDevice: boolean;
  openAlerts: number;
  heartRate: number | null;
  spo2: number | null;
  tempC: number | null;
  systolic: number | null;
  diastolic: number | null;
  respiratoryRate: number | null;
  bpMeasuredAt: string | null;
  bpMeasuredAge: string | null;
  lastReadingAge: string | null;
};

export async function getBedsOverview(
  session: SessionPayload,
): Promise<BedCard[]> {
  const rooms = await prisma.room.findMany({
    where: {
      ward: wardsWhereForSession(session),
    },
    orderBy: [{ ward: { name: "asc" } }, { number: "asc" }],
    include: {
      ward: true,
      patients: {
        where: { status: "ACTIVE" },
        take: 1,
        include: {
          devices: {
            include: {
              readings: { orderBy: { recordedAt: "desc" }, take: 1 },
              alerts: {
                where: { status: { in: ["ACTIVE", "ACKNOWLEDGED"] } },
              },
            },
          },
        },
      },
      devices: {
        include: {
          readings: { orderBy: { recordedAt: "desc" }, take: 1 },
          alerts: {
            where: { status: { in: ["ACTIVE", "ACKNOWLEDGED"] } },
          },
        },
      },
    },
  });

  return rooms.map((room) => {
    const patient = room.patients[0] ?? null;
    const device =
      patient?.devices[0] ??
      room.devices.find((d) => d.patientId === patient?.id) ??
      room.devices[0] ??
      null;
    const reading = device?.readings[0] ?? null;
    const resolved = resolveMonitorStatus({
      hasDevice: Boolean(device),
      lastSeen: device?.lastSeen,
      reading,
    });
    const bpAt =
      reading?.systolic != null || reading?.diastolic != null
        ? reading.recordedAt
        : null;

    return {
      roomId: room.id,
      roomNumber: room.number,
      wardId: room.wardId,
      wardName: room.ward.name,
      bedStatus: room.status,
      occupancy: patient ? ("occupied" as const) : ("empty" as const),
      patientId: patient?.id ?? null,
      patientName: patient?.fullName ?? null,
      patientCode: patient?.patientCode ?? null,
      age: patient?.age ?? null,
      sex: patient?.sex ?? null,
      status: resolved.status,
      scoreTotal: resolved.scoreTotal,
      online: resolved.online,
      hasDevice: Boolean(device),
      openAlerts: device?.alerts.length ?? 0,
      heartRate: reading?.heartRate ?? null,
      spo2: reading?.spo2 ?? null,
      tempC: reading?.tempC ?? null,
      systolic: reading?.systolic ?? null,
      diastolic: reading?.diastolic ?? null,
      respiratoryRate: reading?.respiratoryRate ?? null,
      bpMeasuredAt: bpAt?.toISOString() ?? null,
      bpMeasuredAge: formatRelativeAge(bpAt),
      lastReadingAge: formatRelativeAge(reading?.recordedAt),
    };
  });
}

export type AlertFeedItem = {
  id: string;
  alertType: string;
  status: string;
  value: number | null;
  createdAt: string;
  createdAge: string | null;
  acknowledgedAt: string | null;
  deviceName: string;
  wardId: string;
  wardName: string;
  roomNumber: string;
  patientId: string | null;
  patientName: string | null;
  patientCode: string | null;
};

export async function getAlertsFeed(
  session: SessionPayload,
  opts?: { status?: string },
): Promise<AlertFeedItem[]> {
  const wardFilter = wardsWhereForSession(session);
  const statusFilter =
    opts?.status && opts.status !== "all"
      ? { status: opts.status }
      : undefined;

  const alerts = await prisma.alert.findMany({
    where: {
      ...statusFilter,
      device: {
        OR: [
          { room: { ward: wardFilter } },
          { patient: { room: { ward: wardFilter } } },
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      device: {
        include: {
          room: { include: { ward: true } },
          patient: { include: { room: { include: { ward: true } } } },
        },
      },
    },
  });

  return alerts.map((a) => {
    const ward =
      a.device.room?.ward ?? a.device.patient?.room.ward ?? null;
    const roomNumber =
      a.device.room?.number ?? a.device.patient?.room.number ?? "?";
    const patient = a.device.patient;
    return {
      id: a.id,
      alertType: a.alertType,
      status: a.status,
      value: a.value,
      createdAt: a.createdAt.toISOString(),
      createdAge: formatRelativeAge(a.createdAt),
      acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
      deviceName: a.device.deviceName,
      wardId: ward?.id ?? "",
      wardName: ward?.name ?? "—",
      roomNumber,
      patientId: patient?.id ?? null,
      patientName: patient?.fullName ?? null,
      patientCode: patient?.patientCode ?? null,
    };
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
      thresholdOverride: true,
      admittingDoctor: {
        select: { id: true, displayName: true, email: true },
      },
      assignedNurse: {
        select: { id: true, displayName: true, email: true },
      },
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
  const lastBp = readings.find(
    (r) => r.systolic != null || r.diastolic != null,
  );

  return {
    id: patient.id,
    fullName: patient.fullName,
    patientCode: patient.patientCode,
    age: patient.age,
    sex: patient.sex,
    admissionReason: patient.admissionReason,
    patientStatus: patient.status,
    admittingDoctor: patient.admittingDoctor
      ? {
          id: patient.admittingDoctor.id,
          name:
            patient.admittingDoctor.displayName ||
            patient.admittingDoctor.email,
        }
      : null,
    assignedNurse: patient.assignedNurse
      ? {
          id: patient.assignedNurse.id,
          name:
            patient.assignedNurse.displayName || patient.assignedNurse.email,
        }
      : null,
    admittedAt: patient.admittedAt.toISOString(),
    dischargedAt: patient.dischargedAt?.toISOString() ?? null,
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
    hasThresholdOverride: Boolean(patient.thresholdOverride),
    latest: latest
      ? {
          heartRate: latest.heartRate,
          spo2: latest.spo2,
          tempC: latest.tempC,
          systolic: latest.systolic,
          diastolic: latest.diastolic,
          respiratoryRate: latest.respiratoryRate,
          recordedAt: latest.recordedAt.toISOString(),
          recordedAge: formatRelativeAge(latest.recordedAt),
        }
      : null,
    bp: lastBp
      ? {
          systolic: lastBp.systolic,
          diastolic: lastBp.diastolic,
          measuredAt: lastBp.recordedAt.toISOString(),
          measuredAge: formatRelativeAge(lastBp.recordedAt),
        }
      : null,
    readings: readings.map((r) => ({
      id: r.id,
      heartRate: r.heartRate,
      spo2: r.spo2,
      tempC: r.tempC,
      systolic: r.systolic,
      diastolic: r.diastolic,
      respiratoryRate: r.respiratoryRate,
      recordedAt: r.recordedAt.toISOString(),
      score: aggregateScore(r),
    })),
    alerts: alerts.map((a) => ({
      id: a.id,
      alertType: a.alertType,
      status: a.status,
      value: a.value,
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
