import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";
import { randomUUID } from "crypto";
import {
  aggregateScore,
  scoreHeartRate,
  scoreSpo2,
  scoreSystolic,
  scoreTemp,
} from "../lib/vitalScore";

function withSeedParams(raw: string) {
  const url = new URL(raw.trim());
  url.searchParams.set("connection_limit", "1");
  url.searchParams.set("pool_timeout", "60");
  url.searchParams.set("connect_timeout", "60");
  return url.toString();
}

const baseUrl =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!baseUrl) {
  throw new Error("DATABASE_URL / DATABASE_URL_UNPOOLED is not set");
}

const prisma = new PrismaClient({
  datasources: { db: { url: withSeedParams(baseUrl) } },
});

const WARD_NAMES = ["ICU-A", "ICU-B", "Pediatric Ward", "General Ward"];

const DEFAULT_PASSWORD = "changeme123";

type Vitals = {
  heartRate: number;
  spo2: number;
  tempC: number;
  systolic: number;
  diastolic: number;
};

function alertTypes(vitals: Vitals): string[] {
  const types: string[] = [];
  if (scoreHeartRate(vitals.heartRate) > 0) {
    types.push(vitals.heartRate >= 91 ? "HIGH_HR" : "LOW_HR");
  }
  if (scoreSpo2(vitals.spo2) > 0) types.push("LOW_SPO2");
  if (scoreSystolic(vitals.systolic) > 0) {
    types.push(vitals.systolic >= 220 ? "HIGH_SYSTOLIC" : "LOW_SYSTOLIC");
  }
  if (scoreTemp(vitals.tempC) > 0) {
    types.push(vitals.tempC >= 38.1 ? "HIGH_TEMP" : "LOW_TEMP");
  }
  return types;
}

function normalVitals(jitter: number): Vitals {
  return {
    heartRate: 72 + (jitter % 8),
    spo2: 98 - (jitter % 2),
    tempC: 36.6 + (jitter % 3) * 0.1,
    systolic: 118 + (jitter % 6),
    diastolic: 76 + (jitter % 4),
  };
}

/** SpO2 88 + elevated HR → aggregate URGENT (≥5) */
function urgentVitals(): Vitals {
  return {
    heartRate: 125,
    spo2: 88,
    tempC: 37.2,
    systolic: 128,
    diastolic: 82,
  };
}

/** Mild SpO2 dip → LOW */
function lowVitals(): Vitals {
  return {
    heartRate: 88,
    spo2: 94,
    tempC: 37.0,
    systolic: 122,
    diastolic: 78,
  };
}

async function seedReadingHistory(
  deviceId: string,
  profile: "normal" | "low" | "urgent",
) {
  const now = Date.now();
  const points = 24;
  const rows: Array<Vitals & { deviceId: string; recordedAt: Date }> = [];

  for (let i = points - 1; i >= 0; i--) {
    const recordedAt = new Date(now - i * 2 * 60_000);
    let vitals: Vitals;
    if (profile === "urgent" && i < 4) {
      vitals = urgentVitals();
    } else if (profile === "low" && i < 6) {
      vitals = lowVitals();
    } else {
      vitals = normalVitals(i);
    }
    rows.push({ deviceId, ...vitals, recordedAt });
  }

  await prisma.reading.createMany({ data: rows });

  const latest = rows[rows.length - 1]!;
  const score = aggregateScore(latest);
  if (score.level === "URGENT" || score.level === "LOW") {
    const reading = await prisma.reading.findFirst({
      where: { deviceId, recordedAt: latest.recordedAt },
      orderBy: { recordedAt: "desc" },
    });
    if (reading) {
      await prisma.alert.createMany({
        data: alertTypes(latest).map((alertType) => ({
          deviceId,
          readingId: reading.id,
          alertType,
          createdAt: latest.recordedAt,
        })),
      });
    }
  }

  await prisma.device.update({
    where: { id: deviceId },
    data: { lastSeen: new Date(now) },
  });
}

async function main() {
  console.log("Seeding via direct Neon connection…");

  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.reading.deleteMany();
  await prisma.device.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ward.deleteMany();

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  await prisma.user.create({
    data: {
      email: "admin@hospital.test",
      passwordHash,
      role: "admin",
      wardId: null,
    },
  });
  console.log("Created admin: admin@hospital.test");

  await prisma.user.create({
    data: {
      email: "doctor@hospital.test",
      passwordHash,
      role: "doctor",
      wardId: null,
    },
  });
  console.log("Created doctor: doctor@hospital.test");

  let patientSeq = 1;

  for (let wi = 0; wi < WARD_NAMES.length; wi++) {
    const wardName = WARD_NAMES[wi]!;
    const ward = await prisma.ward.create({ data: { name: wardName } });
    const slug = wardName.toLowerCase().replace(/[^a-z0-9]+/g, ".");
    const nurseEmail = `nurse.${slug}@hospital.test`;

    await prisma.user.create({
      data: {
        email: nurseEmail,
        passwordHash,
        role: "nurse",
        wardId: ward.id,
      },
    });

    const room = await prisma.room.create({
      data: { wardId: ward.id, number: "1" },
    });

    const patientCode = `P-${String(patientSeq++).padStart(4, "0")}`;
    const profile =
      wi === 0 ? "urgent" : wi === 1 ? "low" : ("normal" as const);
    const fullName =
      profile === "urgent"
        ? `Urgent Demo (${wardName})`
        : profile === "low"
          ? `Watch Demo (${wardName})`
          : `Demo Patient (${wardName})`;

    const patient = await prisma.patient.create({
      data: {
        roomId: room.id,
        fullName,
        patientCode,
      },
    });

    const apiKey = `dev_${randomUUID()}`;
    const device = await prisma.device.create({
      data: {
        patientId: patient.id,
        deviceName: `ESP32-${slug}`,
        apiKey,
      },
    });

    await seedReadingHistory(device.id, profile);

    console.log(`Created ward "${wardName}" room 1 · nurse ${nurseEmail}`);
    console.log(
      `  patient ${patientCode} (${profile}) · device apiKey: ${apiKey}`,
    );
  }

  // Refresh lastSeen after all writes so every device is Online on first login
  await prisma.device.updateMany({
    data: { lastSeen: new Date() },
  });

  console.log(`\nAll accounts use password: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
