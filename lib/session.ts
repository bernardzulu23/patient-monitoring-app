import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session";
const SESSION_HOURS = 8;
const SESSION_MAX_AGE = 60 * 60 * SESSION_HOURS;

export type SessionPayload = {
  userId: string;
  role: string;
  wardId: string | null;
};

function getSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

function cookieSecure() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

function parseSessionPayload(payload: JWTPayload): SessionPayload | null {
  const userId = payload.userId;
  const role = payload.role;
  const wardId = payload.wardId;

  if (typeof userId !== "string" || !userId) return null;
  if (role !== "admin" && role !== "doctor" && role !== "nurse") return null;
  if (wardId != null && typeof wardId !== "string") return null;

  return { userId, role, wardId: wardId ?? null };
}

export async function encryptSession(payload: SessionPayload) {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    wardId: payload.wardId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getSecret());
}

export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    return parseSessionPayload(payload);
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  role: string,
  wardId: string | null,
) {
  const token = await encryptSession({ userId, role, wardId });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return decryptSession(token);
}

export async function destroySession() {
  (await cookies()).set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}
