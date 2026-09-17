import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const WARD_NAMES = ["ICU-A", "ICU-B", "Pediatric Ward", "General Ward"];

const DEFAULT_PASSWORD = "changeme123";

async function main() {
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

  for (const wardName of WARD_NAMES) {
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
    const patient = await prisma.patient.create({
      data: {
        roomId: room.id,
        fullName: `Demo Patient (${wardName})`,
        patientCode,
      },
    });

    const apiKey = `dev_${randomUUID()}`;
    await prisma.device.create({
      data: {
        patientId: patient.id,
        deviceName: `ESP32-${slug}`,
        apiKey,
      },
    });

    console.log(`Created ward "${wardName}" room 1 · nurse ${nurseEmail}`);
    console.log(`  patient ${patientCode} · device apiKey: ${apiKey}`);
  }

  console.log(`\nAll accounts use password: ${DEFAULT_PASSWORD}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
