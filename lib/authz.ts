import type { SessionPayload } from "@/lib/session";

export type Role = "admin" | "doctor" | "nurse";

export function isAdmin(session: SessionPayload) {
  return session.role === "admin";
}

export function isDoctor(session: SessionPayload) {
  return session.role === "doctor";
}

export function canViewAllWards(session: SessionPayload) {
  return session.role === "admin" || session.role === "doctor";
}

export function canManageWards(session: SessionPayload) {
  return session.role === "admin";
}

export function canManageStaff(session: SessionPayload) {
  return session.role === "admin";
}

export function canAccessWard(session: SessionPayload, wardId: string) {
  if (canViewAllWards(session)) return true;
  return session.role === "nurse" && session.wardId === wardId;
}

export function canManagePatientsInWard(
  session: SessionPayload,
  wardId: string,
) {
  if (session.role === "admin") return true;
  if (session.role === "nurse" && session.wardId === wardId) return true;
  return false;
}

/** Password changes are admin-only for this project scope (no self-service profile). */
export function canResetPasswords(session: SessionPayload) {
  return session.role === "admin";
}
