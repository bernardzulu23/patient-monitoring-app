import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { SignJWT } from "jose";
import * as session from "../lib/session";

// Read lazily by lib/session at sign/verify time.
process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters-long"; // gitleaks:allow

const user = {
  id: "user_a",
  role: "nurse",
  wardId: "ward_1",
  passwordHash: "$2a$12$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvwxyz0123",
};

function b64url(obj: object) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

describe("A10 session JWT", () => {
  let token: string;
  before(async () => {
    token = await session.encryptSession(user);
  });

  it("round-trips a valid token with sub, jti, iss, aud, exp", async () => {
    const claims = await session.decryptSession(token);
    assert.ok(claims);
    assert.equal(claims.userId, "user_a");
    assert.equal(claims.role, "nurse");
    assert.equal(claims.wardId, "ward_1");
    assert.equal(claims.passwordVersion, session.passwordVersion(user.passwordHash));
    assert.match(claims.sessionId, /^[0-9a-f-]{36}$/);
  });

  it("issues a fresh session id on every login (fixation)", async () => {
    const a = await session.decryptSession(await session.encryptSession(user));
    const b = await session.decryptSession(await session.encryptSession(user));
    assert.notEqual(a?.sessionId, b?.sessionId);
  });

  it("rejects alg=none", async () => {
    const [, payload] = token.split(".");
    const forged = `${b64url({ alg: "none", typ: "JWT" })}.${payload}.`;
    assert.equal(await session.decryptSession(forged), null);
  });

  it("rejects a tampered payload (role escalation)", async () => {
    const [header, , sig] = token.split(".");
    const forged = `${header}.${b64url({
      sub: "user_a",
      role: "admin",
      wardId: null,
      jti: "x",
      pwv: "y",
      iss: session.SESSION_ISSUER,
      aud: session.SESSION_AUDIENCE,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })}.${sig}`;
    assert.equal(await session.decryptSession(forged), null);
  });

  it("rejects wrong secret, wrong issuer, wrong audience, and expired tokens", async () => {
    const good = new TextEncoder().encode(process.env.SESSION_SECRET);
    const base = () =>
      new SignJWT({ role: "nurse", wardId: null, pwv: "abc" })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject("user_a")
        .setJti("j1")
        .setIssuedAt();

    const wrongSecret = await base()
      .setIssuer(session.SESSION_ISSUER)
      .setAudience(session.SESSION_AUDIENCE)
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("another-secret-that-is-32-characters-plus"));
    const wrongIss = await base()
      .setIssuer("evil")
      .setAudience(session.SESSION_AUDIENCE)
      .setExpirationTime("1h")
      .sign(good);
    const wrongAud = await base()
      .setIssuer(session.SESSION_ISSUER)
      .setAudience("other-app")
      .setExpirationTime("1h")
      .sign(good);
    const expired = await base()
      .setIssuer(session.SESSION_ISSUER)
      .setAudience(session.SESSION_AUDIENCE)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(good);
    const noExp = await base()
      .setIssuer(session.SESSION_ISSUER)
      .setAudience(session.SESSION_AUDIENCE)
      .sign(good);

    for (const t of [wrongSecret, wrongIss, wrongAud, expired, noExp]) {
      assert.equal(await session.decryptSession(t), null);
    }
  });

  it("password change produces a different password version (kills old sessions)", () => {
    assert.notEqual(
      session.passwordVersion(user.passwordHash),
      session.passwordVersion(`${user.passwordHash}x`),
    );
  });
});

describe("A6 session cookie", () => {
  it("is HttpOnly, SameSite=Lax, path=/", () => {
    const opts = session.sessionCookieOptions();
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, "lax");
    assert.equal(opts.path, "/");
  });

  it("uses Secure + __Host- prefix in production", () => {
    const prev = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = "production";
    try {
      assert.equal(session.sessionCookieOptions().secure, true);
      assert.equal(session.sessionCookieName(), "__Host-session");
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prev;
    }
  });
});

describe("A12 temporary password sessions", () => {
  const base = { userId: "user_a", role: "nurse", wardId: "ward_1", sessionId: "jti_1" };

  it("refuses a session still on an admin-issued temporary password", () => {
    assert.equal(session.activeSession({ ...base, mustChangePassword: true }), null);
  });

  it("passes through a rotated-password session without the pending flag", () => {
    const active = session.activeSession({ ...base, mustChangePassword: false });
    assert.deepEqual(active, base);
  });

  it("treats a missing session as unauthenticated", () => {
    assert.equal(session.activeSession(null), null);
  });
});
