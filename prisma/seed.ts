import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// Add/remove wards here as the hospital grows — everything else scales automatically
const WARD_NAMES = ["ICU-A", "ICU-B", "Pediatric Ward", "General Ward"];

const DEFAULT_PASSWORD = "changeme123"; // rotate per account after first login in a real deployment

async function main() {
  // Clear in FK-safe order so the seed is re-runnable
  await prisma.alert.deleteMany();
  await prisma.reading.deleteMany();
  await prisma.device.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ward.deleteMany();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // One global admin — sees every ward (wardId: null)
  await prisma.user.create({
    data: {
      email: "admin@hospital.test",
      passwordHash,
      role: "admin",
      wardId: null,
    },
  });
  console.log("Created admin: admin@hospital.test");

  // One ward + one nurse per ward, looped so adding wards later is a one-line change
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

    // One demo patient + device per ward so the dashboard has something to show immediately
    const patient = await prisma.patient.create({
      data: {
        wardId: ward.id,
        fullName: `Demo Patient (${wardName})`,
        // Use ward slug — cuid prefixes collide when many rows are created in the same second
        patientCode: `P-${slug.replace(/\./g, "-").toUpperCase()}`,
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

    console.log(`Created ward "${wardName}" with nurse ${nurseEmail}`);
    console.log(`  device apiKey: ${apiKey}`);
  }

  console.log(`\nAll accounts use password: ${DEFAULT_PASSWORD}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
