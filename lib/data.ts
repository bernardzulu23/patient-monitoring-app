import { getSession, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccessWard, canViewAllWards } from "@/lib/authz";
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

function worstLevel(levels: ScoreLevel[]): ScoreLevel {
  if (levels.includes("URGENT")) return "URGENT";
  if (levels.includes("LOW")) return "LOW";
  return "NORMAL";
}

export async function getWardOverview(session: SessionPayload) {
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
                },
              },
            },
          },
        },
      },
    },
  });

  return wards.map((ward) => {
    const patients = ward.rooms.flatMap((r) => r.patients);
    const levels: ScoreLevel[] = [];
    let onlineDevices = 0;
    let deviceCount = 0;

    for (const patient of patients) {
      for (const device of patient.devices) {
        deviceCount += 1;
        if (device.lastSeen && Date.now() - device.lastSeen.getTime() < 60_000) {
          onlineDevices += 1;
        }
        const reading = device.readings[0];
        if (reading) {
          levels.push(aggregateScore(reading).level);
        }
      }
    }

    const scoreLevel = worstLevel(levels);

    return {
      id: ward.id,
      name: ward.name,
      patientCount: patients.length,
      roomCount: ward.rooms.length,
      openAlerts: levels.filter((l) => l !== "NORMAL").length,
      scoreLevel,
      onlineDevices,
      deviceCount,
    };
  });
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
