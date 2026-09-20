"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScoreBadge } from "@/components/score-badge";
import { Sparkline } from "@/components/sparkline";
import { VitalChip } from "@/components/vital-chip";
import { PatientThresholdOverrideForm } from "@/components/patient-threshold-override-form";
import type { MonitorStatus } from "@/lib/ingestReading";
import type { ScoreLevel } from "@/lib/vitalScore";

const POLL_MS = 4000;

type PatientLivePayload = {
  id: string;
  fullName: string;
  patientCode: string;
  dateOfBirth?: string | null;
  nrc?: string | null;
  residentialArea?: string | null;
  age: number | null;
  sex: string | null;
  admissionReason: string | null;
  nextOfKinFullName?: string | null;
  nextOfKinResidentialArea?: string | null;
  nextOfKinPhone?: string | null;
  nextOfKinRelation?: string | null;
  patientStatus: string;
  admittedAt: string;
  dischargedAt: string | null;
  wardId: string;
  wardName: string;
  roomId: string;
  roomNumber: string;
  deviceName: string | null;
  lastSeenAge: string | null;
  status: MonitorStatus;
  latestScore: { total: number; level: ScoreLevel } | null;
  hasThresholdOverride: boolean;
  latest: {
    heartRate: number | null;
    spo2: number | null;
    tempC: number | null;
    systolic: number | null;
    diastolic: number | null;
    respiratoryRate?: number | null;
    recordedAt: string;
    recordedAge: string | null;
  } | null;
  admittingDoctor?: { id: string; name: string } | null;
  assignedNurse?: { id: string; name: string } | null;
  bp: {
    systolic: number | null;
    diastolic: number | null;
    measuredAt: string;
    measuredAge: string | null;
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
    status?: string;
    value?: number | null;
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
  const [dischargeBusy, setDischargeBusy] = useState(false);

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

  async function discharge() {
    if (
      !confirm(
        `Discharge ${data.fullName}? Bed will free; record is archived.`,
      )
    ) {
      return;
    }
    setDischargeBusy(true);
    const res = await fetch(`/api/patients/${patientId}/discharge`, {
      method: "POST",
    });
    setDischargeBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert((body as { error?: string }).error || "Discharge failed");
      return;
    }
    window.location.href = `/dashboard/wards/${data.wardId}/rooms/${data.roomId}`;
  }

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
            ← {data.wardName} · Bed {data.roomNumber}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-ink">
              {data.fullName}
            </h1>
            <ScoreBadge
              level={data.status}
              total={data.latestScore?.total}
            />
            {data.patientStatus === "DISCHARGED" && (
              <span className="rounded-md bg-ink-muted/15 px-2 py-0.5 text-xs font-semibold text-ink-muted">
                Discharged
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {data.patientCode}
            {data.dateOfBirth
              ? ` · DOB ${new Date(data.dateOfBirth).toLocaleDateString()}`
              : data.age != null
                ? ` · ${data.age}y`
                : ""}
            {data.sex ? ` · ${data.sex}` : ""}
            {data.nrc ? ` · NRC ${data.nrc}` : ""}
            {data.residentialArea ? ` · ${data.residentialArea}` : ""}
            {" · admitted "}
            {new Date(data.admittedAt).toLocaleDateString()}
            {data.admissionReason ? ` · ${data.admissionReason}` : ""}
            {data.admittingDoctor
              ? ` · Dr ${data.admittingDoctor.name}`
              : ""}
            {data.assignedNurse ? ` · Nurse ${data.assignedNurse.name}` : ""}
            {data.deviceName ? ` · ${data.deviceName}` : " · no device"}
            {data.lastSeenAge ? ` · last seen ${data.lastSeenAge}` : ""}
          </p>
          {(data.nextOfKinFullName || data.nextOfKinPhone) && (
            <p className="mt-1 text-sm text-ink-muted">
              Next of kin: {data.nextOfKinFullName || "—"}
              {data.nextOfKinRelation ? ` (${data.nextOfKinRelation})` : ""}
              {data.nextOfKinPhone ? ` · ${data.nextOfKinPhone}` : ""}
              {data.nextOfKinResidentialArea
                ? ` · ${data.nextOfKinResidentialArea}`
                : ""}
            </p>
          )}
          <p className="mt-1 text-xs text-ink-muted">
            Score is NEWS2-inspired (not full NEWS2 — no respiratory rate or
            consciousness).
            {updatedAt
              ? ` · Updated ${updatedAt.toLocaleTimeString()}`
              : " · Live"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          {data.canSimulate && data.patientStatus === "ACTIVE" && (
            <button
              type="button"
              onClick={discharge}
              disabled={dischargeBusy}
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-alert hover:text-alert disabled:opacity-60"
            >
              {dischargeBusy ? "Discharging…" : "Discharge"}
            </button>
          )}
          {data.canSimulate && (
            <button
              type="button"
              onClick={simulateReading}
              disabled={simBusy || !data.deviceName}
              className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
            >
              {simBusy ? "Simulating…" : "Simulate reading"}
            </button>
          )}
            <a
              href={`/api/patients/${patientId}/export.csv`}
              className="text-xs font-medium text-brand hover:underline"
            >
              Export CSV
            </a>
            <a
              href={`/dashboard/patients/${patientId}/print`}
              className="text-xs font-medium text-brand hover:underline"
            >
              Print / PDF
            </a>
          {simError && <p className="text-xs text-alert">{simError}</p>}
          {data.canSimulate && (
            <p className="text-xs text-ink-muted">Demo without ESP32</p>
          )}
        </div>
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
              label="RR"
              value={data.latest.respiratoryRate ?? null}
              unit="/min"
            />
            <VitalChip
              label="BP"
              value={
                data.bp
                  ? data.bp.systolic != null && data.bp.diastolic != null
                    ? `${data.bp.systolic}/${data.bp.diastolic}`
                    : null
                  : data.latest.systolic != null && data.latest.diastolic != null
                    ? `${data.latest.systolic}/${data.latest.diastolic}`
                    : null
              }
            />
            <span className="self-center text-xs text-ink-muted">
              Continuous:{" "}
              {data.latest.recordedAge ??
                new Date(data.latest.recordedAt).toLocaleString()}
              {data.bp?.measuredAge
                ? ` · BP measured ${data.bp.measuredAge}`
                : " · BP not continuous"}
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
        {data.canSimulate && (
          <div className="mb-3">
            <PatientThresholdOverrideForm patientId={patientId} />
          </div>
        )}
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
                  {a.status ? ` · ${a.status}` : ""}
                  {a.value != null ? ` · ${a.value}` : ""}
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
