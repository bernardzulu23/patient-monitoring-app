import { createHash, randomUUID } from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

const SESSION_HOURS = 8;
const SESSION_MAX_AGE = 60 * 60 * SESSION_HOURS;
export const SESSION_ISSUER = "patient-monitor";
export const SESSION_AUDIENCE = "patient-monitor:dashboard";
/** Audit action whose targetId is a revoked session id (jti). */
export const SESSION_REVOKED_ACTION = "SESSION_REVOKED";

export type SessionPayload = {
  userId: string;
  role: string;
  wardId: string | null;
  sessionId?: string;
};

/** A validated session that may still be holding an admin-issued temporary password. */
export type PendingSessionPayload = SessionPayload & {
  mustChangePassword: boolean;
};

export type SessionClaims = SessionPayload & {
  sessionId: string;
  passwordVersion: string;
};

export type SessionUser = {
  id: string;
  role: string;
  wardId: string | null;
  passwordHash: string;
};

function getSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

export function cookieSecure() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

/** `__Host-` binds the cookie to this exact origin; browsers only accept it with Secure. */
export function sessionCookieName() {
  return cookieSecure() ? "__Host-session" : "session";
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

/** Changes whenever the password hash changes, so password change/reset kills old sessions. */
export function passwordVersion(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

function isRole(role: unknown): role is "admin" | "doctor" | "nurse" {
  return role === "admin" || role === "doctor" || role === "nurse";
}

function parseClaims(payload: JWTPayload): SessionClaims | null {
  const userId = payload.sub;
  const { role, wardId, pwv } = payload as Record<string, unknown>;
  const sessionId = payload.jti;

  if (typeof userId !== "string" || !userId) return null;
  if (!isRole(role)) return null;
  if (wardId != null && typeof wardId !== "string") return null;
  if (typeof sessionId !== "string" || !sessionId) return null;
  if (typeof pwv !== "string" || !pwv) return null;

  return {
    userId,
    role,
    wardId: (wardId as string | null) ?? null,
    sessionId,
    passwordVersion: pwv,
  };
}

export async function encryptSession(user: SessionUser) {
  return new SignJWT({
    role: user.role,
    wardId: user.wardId,
    pwv: passwordVersion(user.passwordHash),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setJti(randomUUID())
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getSecret());
}

/** Signature, algorithm, issuer, audience and expiry only — safe for the edge of the proxy. */
export async function decryptSession(
  token: string | undefined,
): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) return null;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      requiredClaims: ["exp", "iat", "sub", "jti"],
    });
    return parseClaims(payload);
  } catch {
    return null;
  }
}

/**
 * Server-side validation: account still exists, password unchanged since sign-in,
 * session not revoked by logout. Role/ward come from the DB so privilege changes apply at once.
 */
export async function validateSessionClaims(
  claims: SessionClaims,
): Promise<PendingSessionPayload | null> {
  const { prisma } = await import("@/lib/prisma");
  const [user, revoked] = await Promise.all([
    prisma.user.findUnique({
      where: { id: claims.userId },
      select: {
        id: true,
        role: true,
        wardId: true,
        passwordHash: true,
        mustChangePassword: true,
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        action: SESSION_REVOKED_ACTION,
        targetType: "Session",
        targetId: claims.sessionId,
      },
      select: { id: true },
    }),
  ]);

  if (!user || revoked) return null;
  if (passwordVersion(user.passwordHash) !== claims.passwordVersion) return null;
  if (!isRole(user.role)) return null;

  return {
    userId: user.id,
    role: user.role,
    wardId: user.wardId,
    sessionId: claims.sessionId,
    mustChangePassword: user.mustChangePassword,
  };
}

/** Strips the pending flag; a temporary-password session is not a usable session. */
export function activeSession(
  session: PendingSessionPayload | null,
): SessionPayload | null {
  if (!session || session.mustChangePassword) return null;
  const { mustChangePassword: _pending, ...active } = session;
  return active;
}

export async function createSession(user: SessionUser) {
  const token = await encryptSession(user);
  (await cookies()).set(sessionCookieName(), token, sessionCookieOptions());
}

/**
 * Includes accounts still on an admin-issued temporary password. Only the
 * dashboard shell, the settings page and the password-change API may use this.
 */
export const getSessionAllowingPasswordChange = cache(
  async (): Promise<PendingSessionPayload | null> => {
    const token = (await cookies()).get(sessionCookieName())?.value;
    const claims = await decryptSession(token);
    if (!claims) return null;
    return validateSessionClaims(claims);
  },
);

export const getSession = cache(
  async (): Promise<SessionPayload | null> =>
    activeSession(await getSessionAllowingPasswordChange()),
);

/** Revoke the current session server-side, then clear the cookie. */
export async function destroySession() {
  const jar = await cookies();
  const claims = await decryptSession(jar.get(sessionCookieName())?.value);
  if (claims) {
    const { logAction } = await import("@/lib/audit");
    await logAction(claims.userId, SESSION_REVOKED_ACTION, "Session", claims.sessionId);
  }
  jar.set(sessionCookieName(), "", { ...sessionCookieOptions(), maxAge: 0 });
}
