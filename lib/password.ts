import bcrypt from "bcryptjs";

export const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt only uses the first 72 bytes */
export const MAX_PASSWORD_LENGTH = 72;

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
