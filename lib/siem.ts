export type SiemSeverity = "critical" | "high" | "medium" | "low" | "info";

const CRITICAL = new Set([
  "DELETED_STAFF",
  "DELETED_WARD",
  "DELETED_PATIENT",
  "DISCHARGED_PATIENT",
  "LOGIN_FAILED",
  "LOGIN_RATE_LIMITED",
]);

const HIGH = new Set([
  "RESET_STAFF_PASSWORD",
  "CREATED_STAFF",
  "CHANGED_PASSWORD",
  "DELETED_ROOM",
  "UPDATED_THRESHOLDS",
  "ACKNOWLEDGED_ALERT",
]);

const MEDIUM = new Set([
  "CREATED_WARD",
  "RENAMED_WARD",
  "CREATED_ROOM",
  "UPDATED_ROOM",
  "CREATED_PATIENT",
  "UPDATED_PATIENT",
  "ADDED_DEVICE",
  "LANDING_IMAGE_UPLOADED",
  "LANDING_IMAGE_DELETED",
]);

const LOW = new Set(["DEVICE_READING_INGESTED", "LOGGED_IN"]);

export function severityForAction(action: string): SiemSeverity {
  if (CRITICAL.has(action)) return "critical";
  if (HIGH.has(action)) return "high";
  if (MEDIUM.has(action)) return "medium";
  if (LOW.has(action)) return "low";
  return "info";
}

export function severityLabel(s: SiemSeverity): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
