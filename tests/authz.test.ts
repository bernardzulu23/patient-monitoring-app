import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessWard,
  canAdmitPatients,
  canManagePatientsInWard,
  canManageStaff,
  canManageWards,
} from "../lib/authz";
import type { SessionPayload } from "../lib/session";

const nurseA: SessionPayload = { userId: "n-a", role: "nurse", wardId: "ward-a" };
const nurseB: SessionPayload = { userId: "n-b", role: "nurse", wardId: "ward-b" };
const nurseNoWard: SessionPayload = { userId: "n-x", role: "nurse", wardId: null };
const doctor: SessionPayload = { userId: "d-1", role: "doctor", wardId: null };
const admin: SessionPayload = { userId: "a-1", role: "admin", wardId: null };

describe("Z2 ward isolation between nurses", () => {
  it("nurse A cannot read or write ward B", () => {
    assert.equal(canAccessWard(nurseA, "ward-b"), false);
    assert.equal(canManagePatientsInWard(nurseA, "ward-b"), false);
    assert.equal(canAccessWard(nurseB, "ward-a"), false);
  });

  it("nurse A can read and write their own ward", () => {
    assert.equal(canAccessWard(nurseA, "ward-a"), true);
    assert.equal(canManagePatientsInWard(nurseA, "ward-a"), true);
  });

  it("a nurse without a ward has no ward access and cannot admit", () => {
    assert.equal(canAccessWard(nurseNoWard, "ward-a"), false);
    assert.equal(canAdmitPatients(nurseNoWard), false);
  });
});

describe("Z3 vertical privilege", () => {
  it("doctors read all wards but cannot write patients, wards or staff", () => {
    assert.equal(canAccessWard(doctor, "ward-a"), true);
    assert.equal(canManagePatientsInWard(doctor, "ward-a"), false);
    assert.equal(canManageWards(doctor), false);
    assert.equal(canManageStaff(doctor), false);
    assert.equal(canAdmitPatients(doctor), false);
  });

  it("nurses cannot manage wards or staff", () => {
    assert.equal(canManageWards(nurseA), false);
    assert.equal(canManageStaff(nurseA), false);
  });

  it("only admins manage wards and staff", () => {
    assert.equal(canManageWards(admin), true);
    assert.equal(canManageStaff(admin), true);
  });

  it("an unknown role gets nothing", () => {
    const rogue = { userId: "r", role: "superuser", wardId: "ward-a" } as SessionPayload;
    assert.equal(canAccessWard(rogue, "ward-a"), false);
    assert.equal(canManagePatientsInWard(rogue, "ward-a"), false);
    assert.equal(canManageStaff(rogue), false);
  });
});
