"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AlertFeedItem } from "@/lib/data";

const POLL_MS = 4000;

export function AlertsLive({
  initial,
  canAcknowledge,
}: {
  initial: AlertFeedItem[];
  canAcknowledge: boolean;
}) {
  const [alerts, setAlerts] = useState(initial);
  const [status, setStatus] = useState("ACTIVE");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    setAlerts(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(
          `/api/dashboard/alerts?status=${encodeURIComponent(status)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { alerts: AlertFeedItem[] };
        if (!cancelled) {
          setAlerts(data.alerts);
          setUpdatedAt(new Date());
        }
      } catch {
        // keep
      }
    }
    const id = setInterval(tick, POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [status]);

  async function acknowledge(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/alerts/${id}/acknowledge`, {
        method: "POST",
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: "ACKNOWLEDGED",
                  acknowledgedAt: new Date().toISOString(),
                }
              : a,
          ),
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Alerts
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Threshold breaches and device-offline events · polls every 4s
          </p>
        </div>
        <p className="text-xs text-ink-muted tabular-nums">
          {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Live"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "all"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              status === s
                ? "border-brand bg-brand-soft text-brand-deep"
                : "border-line bg-surface text-ink-muted"
            }`}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bg/60 text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Patient / bed</th>
              <th className="px-4 py-3 font-medium">Value</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canAcknowledge && (
                <th className="px-4 py-3 font-medium text-right">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td
                  colSpan={canAcknowledge ? 6 : 5}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  No alerts in this filter.
                </td>
              </tr>
            ) : (
              alerts.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-line/70 last:border-0"
                >
                  <td className="px-4 py-2.5 text-xs text-ink-muted">
                    {a.createdAge ?? new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {a.alertType.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2.5">
                    {a.patientId ? (
                      <Link
                        href={`/dashboard/patients/${a.patientId}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {a.patientName}
                      </Link>
                    ) : (
                      <span className="text-ink-muted">Unassigned</span>
                    )}
                    <p className="text-xs text-ink-muted">
                      {a.wardName} · Bed {a.roomNumber}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {a.value != null ? a.value : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold">
                    {a.status}
                  </td>
                  {canAcknowledge && (
                    <td className="px-4 py-2.5 text-right">
                      {a.status === "ACTIVE" ? (
                        <button
                          type="button"
                          disabled={busyId === a.id}
                          onClick={() => acknowledge(a.id)}
                          className="rounded-lg border border-line px-2 py-1 text-xs font-medium hover:border-brand disabled:opacity-60"
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
