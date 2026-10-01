"use client";

import { flushOutbox } from "@/lib/offline-outbox";

/**
 * Runtime caches hold dashboard HTML and API JSON (patient data). Clear them on sign-out
 * so the next person on a shared ward tablet cannot read them offline. The Serwist
 * precache only holds the app shell and /offline, so it is kept.
 */
export async function clearOfflinePatientData() {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => !key.includes("precache"))
      .map((key) => caches.delete(key)),
  );
}

/** Try to sync this user's queued changes, then drop cached patient data. */
export async function signOutAndClear(path = "/api/logout") {
  try {
    await flushOutbox();
  } catch {
    // still offline — queued rows stay owned by this user until they sign in again
  }
  try {
    await fetch(path, { method: "POST", credentials: "same-origin" });
  } finally {
    await clearOfflinePatientData();
  }
}
