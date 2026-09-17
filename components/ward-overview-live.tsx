"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { ScoreBadge } from "@/components/score-badge";
import {
  WardOverviewGrid,
  type WardSummary,
} from "@/components/ward-overview-grid";
import type { MonitorStatus } from "@/lib/ingestReading";

const POLL_MS = 4000;

export type AttentionPatientRow = {
  id: string;
  fullName: string;
  patientCode: string;
  wardId: string;
  wardName: string;
  roomId: string;
  roomNumber: string;
  status: MonitorStatus;
  scoreTotal: number;
  lastReadingAge: string | null;
};

export type DashboardLiveData = {
  wards: WardSummary[];
  attention: AttentionPatientRow[];
  totals: {
    urgent: number;
    low: number;
    offline: number;
    online: number;
    openAlerts: number;
  };
};

export function WardOverviewLive({
  initial,
  isAdmin,
}: {
  initial: DashboardLiveData;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/dashboard/wards", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as DashboardLiveData;
        if (!cancelled) {
          setData(payload);
          setUpdatedAt(new Date());
        }
      } catch {
        // keep last snapshot
      }
    }

    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function createWard(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/wards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error || "Create failed");
      return;
    }
    setOpenNew(false);
    setName("");
    router.refresh();
  }

  const { wards, attention, totals } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Live monitoring
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            NEWS2-inspired triage · polls every 4s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-ink-muted tabular-nums">
            {updatedAt
              ? `Updated ${updatedAt.toLocaleTimeString()}`
              : "Live"}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setOpenNew(true);
                setError("");
              }}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-brand"
            >
              New Ward
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile
          label="Urgent"
          value={totals.urgent}
          tone={totals.urgent > 0 ? "alert" : "muted"}
        />
        <StatTile
          label="Low"
          value={totals.low}
          tone={totals.low > 0 ? "warn" : "muted"}
        />
        <StatTile label="Offline" value={totals.offline} tone="muted" />
        <StatTile label="Online" value={totals.online} tone="ok" />
        <StatTile
          label="Open alerts"
          value={totals.openAlerts}
          tone={totals.openAlerts > 0 ? "warn" : "muted"}
        />
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Needs attention
          </h2>
          <p className="text-xs text-ink-muted">
            Urgent, low, and offline patients
          </p>
        </div>
        {attention.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface/60 px-5 py-8 text-sm text-ink-muted">
            No patients currently flagged.
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {attention.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/patients/${p.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-brand-soft/40"
                >
                  <div>
                    <p className="font-medium text-ink">{p.fullName}</p>
                    <p className="text-xs text-ink-muted">
                      {p.wardName} · Room {p.roomNumber} · {p.patientCode}
                      {p.lastReadingAge
                        ? ` · reading ${p.lastReadingAge}`
                        : ""}
                    </p>
                  </div>
                  <ScoreBadge
                    level={p.status}
                    total={
                      p.status === "URGENT" || p.status === "LOW"
                        ? p.scoreTotal
                        : undefined
                    }
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Wards
        </h2>
        <WardOverviewGrid wards={wards} isAdmin={isAdmin} />
      </section>

      <Modal title="New ward" open={openNew} onClose={() => setOpenNew(false)}>
        <form onSubmit={createWard} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Ward name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. ICU-C"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpenNew(false)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "alert" | "warn" | "ok" | "muted";
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
