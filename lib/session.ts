import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type SessionPayload = {
  userId: string;
  role: string;
  wardId: string | null;
};

function getSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(value);
}

export async function encryptSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
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

  (await cookies()).set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
}

export async function getSession() {
  const token = (await cookies()).get("session")?.value;
  return decryptSession(token);
}

export async function destroySession() {
  (await cookies()).delete("session");
}
