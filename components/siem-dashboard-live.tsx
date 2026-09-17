"use client";

import { useEffect, useState } from "react";
import type { SiemSeverity } from "@/lib/siem";
import { severityLabel } from "@/lib/siem";

const POLL_MS = 4000;

type SiemEvent = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  userEmail: string | null;
  userRole: string | null;
  severity: SiemSeverity;
};

type SiemPayload = {
  totals: {
    events24h: number;
    failedLogins24h: number;
    privileged24h: number;
    ingest24h: number;
  };
  severityBreakdown: Record<SiemSeverity, number>;
  events: SiemEvent[];
  fetchedAt: string;
};

const SEVERITY_STYLES: Record<SiemSeverity, string> = {
  critical: "bg-alert-soft text-alert",
  high: "bg-warn-soft text-warn",
  medium: "bg-brand-soft text-brand-deep",
  low: "bg-ok-soft text-ok",
  info: "bg-ink-muted/10 text-ink-muted",
};

export function SiemDashboardLive({ initial }: { initial: SiemPayload }) {
  const [data, setData] = useState(initial);
  const [severity, setSeverity] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const params = new URLSearchParams();
        if (severity !== "all") params.set("severity", severity);
        if (actionFilter.trim()) params.set("action", actionFilter.trim());
        const res = await fetch(`/api/dashboard/siem?${params}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = (await res.json()) as SiemPayload;
        if (!cancelled) {
          setData(payload);
          setUpdatedAt(new Date());
        }
      } catch {
        // keep last snapshot
      }
    }

    const id = setInterval(tick, POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [severity, actionFilter]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            SIEM monitor
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Security-oriented view of append-only audit events · polls every 4s
          </p>
        </div>
        <p className="text-xs text-ink-muted tabular-nums">
          {updatedAt
            ? `Updated ${updatedAt.toLocaleTimeString()}`
            : "Live"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Events (24h)" value={data.totals.events24h} />
        <Stat
          label="Failed logins"
          value={data.totals.failedLogins24h}
          tone={data.totals.failedLogins24h > 0 ? "alert" : "muted"}
        />
        <Stat
          label="Privileged ops"
          value={data.totals.privileged24h}
          tone={data.totals.privileged24h > 0 ? "warn" : "muted"}
        />
        <Stat label="Device ingest" value={data.totals.ingest24h} tone="ok" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          ["all", "critical", "high", "medium", "low", "info"] as const
        ).map((s) => {
          const count =
            s === "all"
              ? Object.values(data.severityBreakdown).reduce((a, b) => a + b, 0)
              : data.severityBreakdown[s];
          const active = severity === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${
                active
                  ? "border-brand bg-brand-soft text-brand-deep"
                  : "border-line bg-surface text-ink-muted hover:border-brand"
              }`}
            >
              {s === "all" ? "All" : severityLabel(s)} · {count}
            </button>
          );
        })}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Filter by action
        </label>
        <input
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="e.g. LOGIN, DELETED, STAFF"
          className="w-full max-w-md rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bg/60 text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {data.events.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  No events match this filter.
                </td>
              </tr>
            ) : (
              data.events.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-line/70 last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[e.severity]}`}
                    >
                      {severityLabel(e.severity)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-ink-muted">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <p>{e.userEmail ?? "(system / unknown)"}</p>
                    {e.userRole && (
                      <p className="text-xs capitalize text-ink-muted">
                        {e.userRole}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">
                    {e.action}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-ink-muted">{e.targetType}</span>{" "}
                    <span className="font-mono text-xs">
                      {e.targetId.length > 12
                        ? `${e.targetId.slice(0, 10)}…`
                        : e.targetId}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: number;
  tone?: "alert" | "warn" | "ok" | "muted";
}) {
  const valueClass =
    tone === "alert"
      ? "text-alert"
      : tone === "warn"
        ? "text-warn"
        : tone === "ok"
          ? "text-brand"
          : "text-ink";

  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}
