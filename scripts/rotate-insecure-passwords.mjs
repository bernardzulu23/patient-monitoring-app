/**
 * One-shot: find users whose password is a known weak demo value and rotate them.
 * Prints the new shared temporary password once — change it after first sign-in.
 *
 * Usage: node --env-file=.env scripts/rotate-insecure-passwords.mjs
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { randomBytes, randomInt } from "crypto";

const WEAK = [
  "changeme123",
  "changeme1234",
  "changeme123!",
  "password",
  "password123",
  "password1234",
  "admin",
  "admin123",
  "admin123456",
];

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pick(chars) {
  return chars[randomInt(chars.length)];
}

function generateStrongPassword(length = 16) {
  const chars = [
    pick(UPPER),
    pick(LOWER),
    pick(DIGITS),
    pick(SYMBOLS),
    ...Array.from({ length: Math.max(0, length - 4) }, () => pick(ALL)),
  ];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, passwordHash: true, role: true },
  });

  const compromised = [];
  for (const user of users) {
    for (const weak of WEAK) {
      if (await bcrypt.compare(weak, user.passwordHash)) {
        compromised.push({ ...user, matched: weak });
        break;
      }
    }
  }

  if (compromised.length === 0) {
    console.log("No users matched known weak passwords.");
    return;
  }

  const nextPassword = generateStrongPassword();
  const passwordHash = await bcrypt.hash(nextPassword, 12);

  for (const user of compromised) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: true },
    });
    console.log(`Rotated ${user.email} (was: ${user.matched})`);
  }

  console.log("");
  console.log("Temporary password for rotated accounts (shown once):");
  console.log(nextPassword);
  console.log("Users must change this at /dashboard/settings on next sign-in.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
