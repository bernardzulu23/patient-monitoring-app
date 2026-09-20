import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";

export const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt only uses the first 72 bytes */
export const MAX_PASSWORD_LENGTH = 72;

const TEMP_PASSWORD_LENGTH = 16;
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pick(chars: string) {
  return chars[randomInt(chars.length)]!;
}

/** Strong temporary password for new/reset staff accounts (shown once). */
export function generateStrongPassword(length = TEMP_PASSWORD_LENGTH) {
  const chars = [
    pick(UPPER),
    pick(LOWER),
    pick(DIGITS),
    pick(SYMBOLS),
    ...Array.from({ length: Math.max(0, length - 4) }, () => pick(ALL)),
  ];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

/** Auto staff ID e.g. DR-A1B2C3 or NR-A1B2C3 */
export function generateStaffId(role: "doctor" | "nurse" | "admin") {
  const prefix = role === "doctor" ? "DR" : role === "nurse" ? "NR" : "AD";
  return `${prefix}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

let dummyHash: string | undefined;

function getDummyHash() {
  if (!dummyHash) {
    dummyHash = bcrypt.hashSync("not-a-real-user", BCRYPT_ROUNDS);
  }
  return dummyHash;
}

/** Always run a compare so missing users take a similar amount of time. */
export async function verifyPassword(
  password: string,
  passwordHash: string | null,
) {
  const hash = passwordHash || getDummyHash();
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return bcrypt.compare(password, getDummyHash());
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function passwordMeetsPolicy(password: string) {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}
