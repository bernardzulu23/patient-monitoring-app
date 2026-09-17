"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScoreBadge } from "@/components/score-badge";
import { Sparkline } from "@/components/sparkline";
import { VitalChip } from "@/components/vital-chip";
import type { MonitorStatus } from "@/lib/ingestReading";
import type { ScoreLevel } from "@/lib/vitalScore";

const POLL_MS = 4000;

type PatientLivePayload = {
  id: string;
  fullName: string;
  patientCode: string;
  admittedAt: string;
  wardId: string;
  wardName: string;
  roomId: string;
  roomNumber: string;
  deviceName: string | null;
  lastSeenAge: string | null;
  status: MonitorStatus;
  latestScore: { total: number; level: ScoreLevel } | null;
  latest: {
    heartRate: number | null;
    spo2: number | null;
    tempC: number | null;
    systolic: number | null;
    diastolic: number | null;
    recordedAt: string;
    recordedAge: string | null;
  } | null;
  readings: Array<{
    id: string;
    heartRate: number | null;
    spo2: number | null;
    tempC: number | null;
    systolic: number | null;
    diastolic: number | null;
    recordedAt: string;
    score: { total: number; level: ScoreLevel };
  }>;
  alerts: Array<{
    id: string;
    alertType: string;
    createdAt: string;
    createdAge: string | null;
  }>;
  canSimulate: boolean;
};

function alertLabel(type: string) {
  return type.replace(/_/g, " ");
}

export function PatientDetailLive({
  patientId,
  initial,
}: {
  patientId: string;
  initial: PatientLivePayload;
}) {
  const [data, setData] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [simBusy, setSimBusy] = useState(false);
  const [simError, setSimError] = useState("");

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/dashboard/patients/${patientId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = (await res.json()) as PatientLivePayload;
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
  }, [patientId]);

  async function simulateReading() {
    setSimBusy(true);
    setSimError("");
    try {
      const res = await fetch(
        `/api/patients/${patientId}/simulate-reading`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSimError(
          (body as { error?: string }).error || "Simulate failed",
        );
        return;
      }
      const refresh = await fetch(`/api/dashboard/patients/${patientId}`, {
        cache: "no-store",
      });
      if (refresh.ok) {
        setData((await refresh.json()) as PatientLivePayload);
        setUpdatedAt(new Date());
      }
    } catch {
      setSimError("Simulate failed");
    } finally {
      setSimBusy(false);
    }
  }

  const chronological = [...data.readings].reverse();
  const asOf = data.latest
    ? new Date(data.latest.recordedAt).toLocaleTimeString()
    : null;

  const hrPoints = chronological
    .filter((r) => r.heartRate != null)
    .map((r) => ({ t: new Date(r.recordedAt).getTime(), v: r.heartRate as number }));

  const spo2Points = chronological
    .filter((r) => r.spo2 != null)
    .map((r) => ({ t: new Date(r.recordedAt).getTime(), v: r.spo2 as number }));

  const scoreTrend = chronological.map((r) => ({
    t: new Date(r.recordedAt).getTime(),
    v: r.score.total,
  }));

  return (
    <div className="animate-rise space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/wards/${data.wardId}/rooms/${data.roomId}`}
            className="text-sm text-brand hover:underline"
          >
            ← {data.wardName} · Room {data.roomNumber}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-ink">
              {data.fullName}
            </h1>
            <ScoreBadge
              level={data.status}
              total={data.latestScore?.total}
            />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {data.patientCode} · admitted{" "}
            {new Date(data.admittedAt).toLocaleDateString()}
            {data.deviceName ? ` · ${data.deviceName}` : " · no device"}
            {data.lastSeenAge ? ` · last seen ${data.lastSeenAge}` : ""}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Score is NEWS2-inspired (not full NEWS2 — no respiratory rate or
            consciousness).
            {updatedAt
              ? ` · Updated ${updatedAt.toLocaleTimeString()}`
              : " · Live"}
          </p>
        </div>
        {data.canSimulate && (
          <div className="text-right">
            <button
              type="button"
              onClick={simulateReading}
              disabled={simBusy || !data.deviceName}
              className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
            >
              {simBusy ? "Simulating…" : "Simulate reading"}
            </button>
            {simError && (
              <p className="mt-1 text-xs text-alert">{simError}</p>
            )}
            <p className="mt-1 text-xs text-ink-muted">Demo without ESP32</p>
          </div>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Latest vitals
        </h2>
        {data.latest ? (
          <div className="flex flex-wrap gap-2">
            <VitalChip label="HR" value={data.latest.heartRate} unit="bpm" />
            <VitalChip label="SpO₂" value={data.latest.spo2} unit="%" />
            <VitalChip
              label="Temp"
              value={data.latest.tempC}
              unit="°C"
              digits={1}
            />
            <VitalChip
              label="BP"
              value={
                data.latest.systolic != null && data.latest.diastolic != null
                  ? `${data.latest.systolic}/${data.latest.diastolic}`
                  : null
              }
            />
            <span className="self-center text-xs text-ink-muted">
              {data.latest.recordedAge ??
                new Date(data.latest.recordedAt).toLocaleString()}
            </span>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No readings recorded yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Alerts
        </h2>
        {data.alerts.length === 0 ? (
          <p className="text-sm text-ink-muted">No alerts for this device.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {data.alerts.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-ink">
                  {alertLabel(a.alertType)}
                </span>
                <span className="text-xs text-ink-muted">
                  {a.createdAge ?? new Date(a.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Heart rate
          </h2>
          <Sparkline points={hrPoints} color="#0b6e6a" unit=" bpm" asOf={asOf} />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            SpO₂
          </h2>
          <Sparkline points={spo2Points} color="#084e4b" unit="%" asOf={asOf} />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Aggregate score trend
          </h2>
          <Sparkline points={scoreTrend} color="#b8321a" asOf={asOf} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Recent readings
        </h2>
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-bg/60 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">HR</th>
                <th className="px-4 py-3 font-medium">SpO₂</th>
                <th className="px-4 py-3 font-medium">Temp</th>
                <th className="px-4 py-3 font-medium">BP</th>
                <th className="px-4 py-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.readings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-ink-muted"
                  >
                    Waiting for device data…
                  </td>
                </tr>
              ) : (
                data.readings.slice(0, 20).map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-line/70 last:border-0"
                  >
                    <td className="px-4 py-2.5 tabular-nums text-ink-muted">
                      {new Date(r.recordedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.heartRate ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.spo2 ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.tempC != null ? r.tempC.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.systolic != null && r.diastolic != null
                        ? `${r.systolic}/${r.diastolic}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <ScoreBadge
                        level={r.score.level}
                        total={r.score.total}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
