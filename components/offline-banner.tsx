"use client";

import { useEffect, useState } from "react";
import { flushOutbox, listMutations } from "@/lib/offline-outbox";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    function refreshOnline() {
      setOffline(!navigator.onLine);
    }
    async function refreshPending() {
      try {
        const rows = await listMutations();
        setPending(rows.length);
      } catch {
        setPending(0);
      }
    }
    refreshOnline();
    void refreshPending();
    window.addEventListener("online", refreshOnline);
    window.addEventListener("offline", refreshOnline);
    const id = window.setInterval(() => void refreshPending(), 5000);
    return () => {
      window.removeEventListener("online", refreshOnline);
      window.removeEventListener("offline", refreshOnline);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    async function onOnline() {
      setOffline(false);
      setSyncing(true);
      try {
        await flushOutbox();
        const rows = await listMutations();
        setPending(rows.length);
      } finally {
        setSyncing(false);
      }
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  if (!offline && pending === 0 && !syncing) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-700/30 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
    >
      {offline ? (
        <span>
          Offline — showing cached data when available. Admits will queue until
          hospital Wi‑Fi returns.
        </span>
      ) : syncing ? (
        <span>Syncing queued changes…</span>
      ) : (
        <span>
          {pending} change{pending === 1 ? "" : "s"} waiting to sync.{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={async () => {
              setSyncing(true);
              try {
                await flushOutbox();
                setPending((await listMutations()).length);
              } finally {
                setSyncing(false);
              }
            }}
          >
            Sync now
          </button>
        </span>
      )}
    </div>
  );
}
