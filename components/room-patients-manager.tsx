"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyOnceBlock } from "@/components/copy-once-block";
import { Modal } from "@/components/modal";
import { ScoreBadge } from "@/components/score-badge";
import { VitalChip } from "@/components/vital-chip";
import type { ScoreLevel } from "@/lib/vitalScore";

type PatientRow = {
  id: string;
  fullName: string;
  patientCode: string;
  scoreLevel: ScoreLevel;
  scoreTotal: number;
  heartRate: number | null;
  spo2: number | null;
  tempC: number | null;
  systolic: number | null;
  diastolic: number | null;
  hasDevice: boolean;
};

export function RoomPatientsManager({
  wardId,
  wardName,
  roomId,
  roomNumber,
  patients,
  canManage,
  suggestedCode,
}: {
  wardId: string;
  wardName: string;
  roomId: string;
  roomNumber: string;
  patients: PatientRow[];
  canManage: boolean;
  suggestedCode: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [patientCode, setPatientCode] = useState(suggestedCode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiKeyOnce, setApiKeyOnce] = useState<string | null>(null);
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);

  async function createPatient(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, fullName, patientCode }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Create failed");
      return;
    }
    const patientId = (data as { patient: { id: string } }).patient.id;
    setCreatedPatientId(patientId);
    setOpen(false);
    setFullName("");
    router.refresh();
  }

  async function addDevice() {
    if (!createdPatientId) return;
    setBusy(true);
    const res = await fetch(`/api/patients/${createdPatientId}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert((data as { error?: string }).error || "Device create failed");
      return;
    }
    setApiKeyOnce(
      (data as { device: { apiKey: string } }).device.apiKey,
    );
    setCreatedPatientId(null);
    router.refresh();
  }

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/wards/${wardId}/rooms`}
            className="text-sm text-brand hover:underline"
          >
            ← {wardName} rooms
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
            Room {roomNumber}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {patients.length} patient{patients.length === 1 ? "" : "s"}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setPatientCode(suggestedCode);
              setError("");
            }}
            className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white hover:bg-brand"
          >
            New Patient
          </button>
        )}
      </div>

      {apiKeyOnce && (
        <CopyOnceBlock
          value={apiKeyOnce}
          warning="Save this device API key now — it will not be shown again. Flash it to the ESP32 firmware as x-api-key."
        />
      )}

      {createdPatientId && !apiKeyOnce && canManage && (
        <div className="rounded-lg border border-brand/30 bg-brand-soft/40 px-4 py-3 text-sm">
          Patient created.{" "}
          <button
            type="button"
            onClick={addDevice}
            disabled={busy}
            className="font-semibold text-brand-deep underline"
          >
            Add Device &amp; show API key once
          </button>
        </div>
      )}

      {patients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center text-sm text-ink-muted">
          No patients in this room yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-bg/60 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">NEWS2-inspired</th>
                <th className="px-4 py-3 font-medium">Latest vitals</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-line/70 last:border-0 hover:bg-brand-soft/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/patients/${p.id}`}
                      className="font-medium text-ink hover:text-brand"
                    >
                      {p.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {p.patientCode}
                  </td>
                  <td className="px-4 py-3">
                    {p.hasDevice ? (
                      <ScoreBadge level={p.scoreLevel} total={p.scoreTotal} />
                    ) : (
                      <span className="text-ink-muted">No device</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <VitalChip label="HR" value={p.heartRate} unit="bpm" />
                      <VitalChip label="SpO₂" value={p.spo2} unit="%" />
                      <VitalChip
                        label="Temp"
                        value={p.tempC}
                        unit="°C"
                        digits={1}
                      />
                      <VitalChip
                        label="BP"
                        value={
                          p.systolic != null && p.diastolic != null
                            ? `${p.systolic}/${p.diastolic}`
                            : null
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="New patient" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={createPatient} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Patient code
            </label>
            <input
              value={patientCode}
              onChange={(e) => setPatientCode(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-white px-3 py-2 font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <p className="mt-1 text-xs text-ink-muted">
              Suggested next code — you can override.
            </p>
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
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
