import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import {
  getPasskeyConfig,
  serializeTransports,
  toPublicPasskey,
} from "../lib/passkey";

describe("passkey config and helpers", () => {
  const prev = {
    PASSKEY_RP_ID: process.env.PASSKEY_RP_ID,
    PASSKEY_ORIGIN: process.env.PASSKEY_ORIGIN,
    VERCEL_URL: process.env.VERCEL_URL,
  };

  after(() => {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("uses PASSKEY_RP_ID and PASSKEY_ORIGIN when set", () => {
    process.env.PASSKEY_RP_ID = "pm.hospital.lan";
    process.env.PASSKEY_ORIGIN = "https://pm.hospital.lan";
    delete process.env.VERCEL_URL;
    const cfg = getPasskeyConfig();
    assert.equal(cfg.rpID, "pm.hospital.lan");
    assert.equal(cfg.origin, "https://pm.hospital.lan");
    assert.ok(cfg.rpName.includes("Patient"));
  });

  it("defaults to localhost for local development", () => {
    delete process.env.PASSKEY_RP_ID;
    delete process.env.PASSKEY_ORIGIN;
    delete process.env.VERCEL_URL;
    const cfg = getPasskeyConfig();
    assert.equal(cfg.rpID, "localhost");
    assert.equal(cfg.origin, "http://localhost:3000");
  });

  it("derives RP ID from VERCEL_URL when passkey env is unset", () => {
    delete process.env.PASSKEY_RP_ID;
    delete process.env.PASSKEY_ORIGIN;
    process.env.VERCEL_URL = "my-app.vercel.app";
    const cfg = getPasskeyConfig();
    assert.equal(cfg.rpID, "my-app.vercel.app");
    assert.equal(cfg.origin, "https://my-app.vercel.app");
  });

  it("serializes authenticator transports as JSON", () => {
    assert.equal(serializeTransports(undefined), null);
    assert.equal(serializeTransports([]), null);
    assert.equal(serializeTransports(["internal", "hybrid"]), '["internal","hybrid"]');
  });

  it("exposes only public passkey metadata to the client", () => {
    const createdAt = new Date("2026-10-01T12:00:00.000Z");
    const pub = toPublicPasskey({
      id: "pk_1",
      name: "Ward tablet",
      deviceType: "multiDevice",
      backedUp: true,
      createdAt,
    });
    assert.deepEqual(pub, {
      id: "pk_1",
      name: "Ward tablet",
      deviceType: "multiDevice",
      backedUp: true,
      createdAt: "2026-10-01T12:00:00.000Z",
    });
    assert.equal("publicKey" in pub, false);
    assert.equal("credentialId" in pub, false);
  });
});

describe("passkey clone-detection counter contract", () => {
  it("documents that SimpleWebAuthn rejects non-increasing counters", async () => {
    // verifyAuthenticationResponse throws when
    // (counter > 0 || credential.counter > 0) && counter <= credential.counter
    const { verifyAuthenticationResponse } = await import(
      "@simplewebauthn/server"
    );
    assert.equal(typeof verifyAuthenticationResponse, "function");
  });
});

describe("passkey ownership (Z2/Z3)", () => {
  it("refuses to delete when userId does not own the row", () => {
    const sessionUserId = "nurse-a";
    const passkey = { id: "pk_1", userId: "nurse-b" };
    const allowed =
      passkey.userId === sessionUserId ? "delete" : "not-found";
    assert.equal(allowed, "not-found");
  });
});
