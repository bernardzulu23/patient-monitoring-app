import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";

export const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 12;
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

/** Frequently breached passwords and patterns that satisfy length but are trivially guessed. */
const COMMON_PASSWORDS = new Set([
  "123456789012",
  "1234567890123",
  "12345678901234",
  "qwertyuiopas",
  "qwerty123456",
  "password1234",
  "password12345",
  "passwordpassword",
  "iloveyou1234",
  "adminadmin123",
  "administrator",
  "welcome12345",
  "letmein12345",
  "changeme1234",
  "changeme123!",
  "hospital1234",
  "hospital12345",
  "nurse1234567",
  "doctor123456",
  "patient12345",
  "monitor12345",
  "zambia123456",
  "lusaka123456",
  "abcdefghijkl",
  "abc123abc123",
  "111111111111",
  "000000000000",
  "aaaaaaaaaaaa",
]);

/** Returns a human-readable reason the password is rejected, or null if acceptable. */
export function passwordPolicyError(
  password: string,
  email?: string | null,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return "This password is too common — choose something less guessable";
  }
  if (/^(.)\1+$/.test(password)) {
    return "Password cannot be a single repeated character";
  }
  if (/password|changeme|qwerty/.test(lower)) {
    return "Password must not contain common words like 'password' or 'changeme'";
  }
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) {
    return "Password must not contain your email name";
  }
  return null;
}

export function passwordMeetsPolicy(password: string, email?: string | null) {
  return passwordPolicyError(password, email) === null;
}
