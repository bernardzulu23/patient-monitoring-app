import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcryptjs";
import {
  BCRYPT_ROUNDS,
  generateStrongPassword,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordPolicyError,
  verifyPassword,
} from "../lib/password";

describe("A1 password hashing", () => {
  it("uses bcrypt with cost >= 12", async () => {
    assert.ok(BCRYPT_ROUNDS >= 12);
    const hash = await hashPassword("Correct-Horse-Battery-9");
    assert.match(hash, /^\$2[aby]\$12\$/);
    assert.equal(bcrypt.getRounds(hash), BCRYPT_ROUNDS);
    assert.equal(await verifyPassword("Correct-Horse-Battery-9", hash), true);
    assert.equal(await verifyPassword("wrong", hash), false);
  });

  it("A4 verifies against a dummy hash when the user does not exist", async () => {
    assert.equal(await verifyPassword("anything", null), false);
  });
});

describe("A2 password policy", () => {
  it("requires at least 12 characters and allows at least 64", () => {
    assert.ok(MIN_PASSWORD_LENGTH >= 12);
    assert.ok(MAX_PASSWORD_LENGTH >= 64);
    assert.ok(passwordPolicyError("Short-pw-1"));
    assert.equal(passwordPolicyError("Tall-Giraffe-Walks-42"), null);
    assert.equal(passwordPolicyError("x".repeat(20) + "Aa1-" + "y".repeat(40)), null);
  });

  it("rejects common and pattern passwords", () => {
    for (const pw of [
      "password1234",
      "changeme1234",
      "hospital1234",
      "aaaaaaaaaaaaaaa",
      "MyPassword2026!",
      "qwerty-long-enough",
    ]) {
      assert.ok(passwordPolicyError(pw), `expected rejection for ${pw}`);
    }
  });

  it("rejects passwords containing the email name", () => {
    assert.ok(passwordPolicyError("mwansa-secure-2026", "mwansa@hospital.zm"));
  });

  it("generated temporary passwords satisfy the policy", () => {
    for (let i = 0; i < 50; i += 1) {
      assert.equal(passwordPolicyError(generateStrongPassword()), null);
    }
  });
});
