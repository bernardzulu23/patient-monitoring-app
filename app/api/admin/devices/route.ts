import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { randomUUID } from "crypto";

/** List devices with bed mapping (admin). */
export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const devices = await prisma.device.findMany({
    orderBy: { deviceName: "asc" },
    include: {
      room: { include: { ward: true } },
      patient: { select: { id: true, fullName: true, patientCode: true } },
    },
  });

  const rooms = await prisma.room.findMany({
    orderBy: [{ ward: { name: "asc" } }, { number: "asc" }],
    include: { ward: true },
  });

  return NextResponse.json({
    devices: devices.map((d) => ({
      id: d.id,
      deviceName: d.deviceName,
      lastSeen: d.lastSeen?.toISOString() ?? null,
      roomId: d.roomId,
      wardName: d.room?.ward.name ?? null,
      roomNumber: d.room?.number ?? null,
      patientId: d.patientId,
      patientName: d.patient?.fullName ?? null,
    })),
    rooms: rooms.map((r) => ({
      id: r.id,
      label: `${r.ward.name} · Bed ${r.number}`,
    })),
  });
}

/** Register a new device to a bed (no patient required). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const roomId = body.roomId;
  const deviceName =
    typeof body.deviceName === "string" && body.deviceName.trim()
      ? body.deviceName.trim()
      : null;

  if (typeof roomId !== "string" || !roomId) {
    return NextResponse.json({ error: "roomId (bed) is required" }, { status: 400 });
  }
  if (!deviceName) {
    return NextResponse.json({ error: "deviceName is required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { patients: { where: { status: "ACTIVE" }, take: 1 } },
  });
  if (!room) {
    return NextResponse.json({ error: "Bed not found" }, { status: 404 });
  }

  const apiKey = `dev_${randomUUID()}`;
  const activePatient = room.patients[0];

  const device = await prisma.device.create({
    data: {
      roomId,
      patientId: activePatient?.id ?? null,
      deviceName,
      apiKey,
    },
  });

  await logAction(session.userId, "ADDED_DEVICE", "Device", device.id);

  return NextResponse.json(
    {
      device: {
        id: device.id,
        deviceName: device.deviceName,
        roomId: device.roomId,
        apiKey,
      },
    },
    { status: 201 },
  );
}
