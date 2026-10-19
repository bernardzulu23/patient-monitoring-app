import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransport,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { cookieSecure } from "@/lib/session";

const CHALLENGE_MAX_AGE_SEC = 5 * 60;
const RP_NAME = "Patient Monitoring System";

export type PasskeyChallengeKind = "registration" | "authentication";

type ChallengePayload = {
  challenge: string;
  kind: PasskeyChallengeKind;
  userId?: string;
};

function challengeCookieName() {
  return cookieSecure() ? "__Host-webauthn-challenge" : "webauthn-challenge";
}

function challengeCookieOptions() {
  return {
    httpOnly: true as const,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: CHALLENGE_MAX_AGE_SEC,
  };
}

/**
 * RP ID = hostname only. Origin = scheme + host (+ port if non-default).
 * Defaults support local `next dev` / `localhost`; production must set env.
 */
export function getPasskeyConfig() {
  const rpID =
    process.env.PASSKEY_RP_ID?.trim() ||
    (process.env.VERCEL_URL
      ? process.env.VERCEL_URL.replace(/^https?:\/\//, "").split("/")[0]
      : "localhost");
  const origin =
    process.env.PASSKEY_ORIGIN?.trim() ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
      : "http://localhost:3000");
  return { rpID, origin, rpName: RP_NAME };
}

export async function setPasskeyChallenge(payload: ChallengePayload) {
  const jar = await cookies();
  jar.set(
    challengeCookieName(),
    JSON.stringify(payload),
    challengeCookieOptions(),
  );
}

export async function consumePasskeyChallenge(
  expectedKind: PasskeyChallengeKind,
): Promise<ChallengePayload | null> {
  const jar = await cookies();
  const raw = jar.get(challengeCookieName())?.value;
  jar.set(challengeCookieName(), "", {
    ...challengeCookieOptions(),
    maxAge: 0,
  });
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChallengePayload;
    if (
      typeof parsed.challenge !== "string" ||
      !parsed.challenge ||
      parsed.kind !== expectedKind
    ) {
      return null;
    }
    if (parsed.userId != null && typeof parsed.userId !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseTransports(
  value: string | null | undefined,
): AuthenticatorTransport[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    return parsed.filter((t): t is AuthenticatorTransport => typeof t === "string");
  } catch {
    return undefined;
  }
}

export function serializeTransports(
  transports: string[] | undefined,
): string | null {
  if (!transports?.length) return null;
  return JSON.stringify(transports);
}

export async function buildRegistrationOptions(user: {
  id: string;
  email: string;
  displayName: string | null;
}) {
  const { rpID, rpName } = getPasskeyConfig();
  const existing = await prisma.passkey.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userID: new TextEncoder().encode(user.id),
    userDisplayName: user.displayName?.trim() || user.email,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: existing.map((p) => ({
      id: p.credentialId,
      transports: parseTransports(p.transports),
    })),
  });

  await setPasskeyChallenge({
    challenge: options.challenge,
    kind: "registration",
    userId: user.id,
  });

  return options;
}

export async function verifyAndStoreRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  name: string | null,
) {
  const challenge = await consumePasskeyChallenge("registration");
  if (!challenge || challenge.userId !== userId) {
    return { ok: false as const, error: "Passkey challenge expired. Try again." };
  }

  const { rpID, origin } = getPasskeyConfig();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (err) {
    console.error("[passkey] registration verify", err);
    return { ok: false as const, error: "Could not verify passkey" };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false as const, error: "Could not verify passkey" };
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  const existing = await prisma.passkey.findUnique({
    where: { credentialId: credential.id },
  });
  if (existing) {
    return { ok: false as const, error: "This passkey is already registered" };
  }

  const passkey = await prisma.passkey.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: serializeTransports(credential.transports),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: name?.trim().slice(0, 80) || null,
    },
  });

  return { ok: true as const, passkey };
}

export async function buildAuthenticationOptions(email?: string | null) {
  const { rpID } = getPasskeyConfig();
  let allowCredentials:
    | { id: string; transports?: AuthenticatorTransport[] }[]
    | undefined;

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        passkeys: {
          select: { credentialId: true, transports: true },
        },
      },
    });
    if (user?.passkeys.length) {
      allowCredentials = user.passkeys.map((p) => ({
        id: p.credentialId,
        transports: parseTransports(p.transports),
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials,
  });

  await setPasskeyChallenge({
    challenge: options.challenge,
    kind: "authentication",
  });

  return options;
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
) {
  const challenge = await consumePasskeyChallenge("authentication");
  if (!challenge) {
    return { ok: false as const, error: "Passkey challenge expired. Try again." };
  }

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          wardId: true,
          passwordHash: true,
          mustChangePassword: true,
        },
      },
    },
  });
  if (!passkey) {
    return { ok: false as const, error: "Unknown passkey" };
  }

  const { rpID, origin } = getPasskeyConfig();
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: parseTransports(passkey.transports),
      },
    });
  } catch (err) {
    console.error("[passkey] authentication verify", err);
    return { ok: false as const, error: "Could not verify passkey" };
  }

  if (!verification.verified) {
    return { ok: false as const, error: "Could not verify passkey" };
  }

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: verification.authenticationInfo.newCounter,
      backedUp: verification.authenticationInfo.credentialBackedUp,
      deviceType: verification.authenticationInfo.credentialDeviceType,
    },
  });

  return { ok: true as const, user: passkey.user, passkeyId: passkey.id };
}

export function toPublicPasskey(p: {
  id: string;
  name: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    deviceType: p.deviceType,
    backedUp: p.backedUp,
    createdAt: p.createdAt.toISOString(),
  };
}
