import { getSession, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function wardsWhereForSession(session: SessionPayload) {
  if (session.role === "admin") return {};
  if (session.wardId) return { id: session.wardId };
  return { id: "__none__" };
}

export async function getWardOverview(session: SessionPayload) {
  const wards = await prisma.ward.findMany({
    where: wardsWhereForSession(session),
    orderBy: { name: "asc" },
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
                where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  return wards.map((ward) => {
    const openAlerts = ward.patients.reduce(
      (sum, p) => sum + p.devices.reduce((s, d) => s + d.alerts.length, 0),
      0,
    );
    const onlineDevices = ward.patients.reduce(
      (sum, p) =>
        sum +
        p.devices.filter(
          (d) => d.lastSeen && Date.now() - d.lastSeen.getTime() < 60_000,
        ).length,
      0,
    );

    return {
      id: ward.id,
      name: ward.name,
      patientCount: ward.patients.length,
      openAlerts,
      onlineDevices,
      deviceCount: ward.patients.reduce((s, p) => s + p.devices.length, 0),
    };
  });
}

export async function getWardDetail(session: SessionPayload, wardId: string) {
  if (session.role !== "admin" && session.wardId !== wardId) return null;

  return prisma.ward.findFirst({
    where: { id: wardId },
    include: {
      patients: {
        orderBy: { fullName: "asc" },
        include: {
          devices: {
            include: {
              readings: { orderBy: { recordedAt: "desc" }, take: 1 },
              alerts: {
                where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                orderBy: { createdAt: "desc" },
                take: 5,
              },
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
      ward: true,
      devices: {
        include: {
          readings: { orderBy: { recordedAt: "desc" }, take: 60 },
          alerts: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
    },
  });

  if (!patient) return null;
  if (session.role !== "admin" && session.wardId !== patient.wardId) {
    return null;
  }
  return patient;
}
