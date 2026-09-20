"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyOnceBlock } from "@/components/copy-once-block";
import { Modal } from "@/components/modal";
import { ScoreBadge } from "@/components/score-badge";
import { VitalChip } from "@/components/vital-chip";
import type { MonitorStatus } from "@/lib/ingestReading";

type PatientRow = {
  id: string;
  fullName: string;
  patientCode: string;
  dateOfBirth: string | null;
  nrc: string | null;
  residentialArea: string | null;
  age: number | null;
  sex: string | null;
  admissionReason: string | null;
  nextOfKinFullName: string | null;
  nextOfKinResidentialArea: string | null;
  nextOfKinPhone: string | null;
  nextOfKinRelation: string | null;
  status: MonitorStatus;
  scoreTotal: number;
  heartRate: number | null;
  spo2: number | null;
  tempC: number | null;
  systolic: number | null;
  diastolic: number | null;
  hasDevice: boolean;
  lastReadingAge: string | null;
  lastSeenAge: string | null;
};

type RoomOption = { id: string; number: string };

export function RoomPatientsManager({
  wardId,
  wardName,
  roomId,
  roomNumber,
  patients,
  wardRooms,
  canManage,
  suggestedCode,
}: {
  wardId: string;
  wardName: string;
  roomId: string;
  roomNumber: string;
  patients: PatientRow[];
  wardRooms: RoomOption[];
  canManage: boolean;
  suggestedCode: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<PatientRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [patientCode, setPatientCode] = useState(suggestedCode);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nrc, setNrc] = useState("");
  const [residentialArea, setResidentialArea] = useState("");
  const [sex, setSex] = useState("");
  const [admissionReason, setAdmissionReason] = useState("");
  const [nextOfKinFullName, setNextOfKinFullName] = useState("");
  const [nextOfKinResidentialArea, setNextOfKinResidentialArea] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [nextOfKinRelation, setNextOfKinRelation] = useState("");
  const [moveRoomId, setMoveRoomId] = useState(roomId);
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
      body: JSON.stringify({
        roomId,
        fullName,
        patientCode,
        dateOfBirth: dateOfBirth || null,
        nrc,
        residentialArea,
        sex: sex || null,
        admissionReason: admissionReason || null,
        nextOfKinFullName,
        nextOfKinResidentialArea: nextOfKinResidentialArea || null,
        nextOfKinPhone,
        nextOfKinRelation: nextOfKinRelation || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Create failed");
      return;
    }
    const id = (data as { patient: { id: string } }).patient.id;
    setCreatedPatientId(id);
    setOpen(false);
    setFullName("");
    setDateOfBirth("");
    setNrc("");
    setResidentialArea("");
    setSex("");
    setAdmissionReason("");
    setNextOfKinFullName("");
    setNextOfKinResidentialArea("");
    setNextOfKinPhone("");
    setNextOfKinRelation("");
    router.refresh();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editPatient) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/patients/${editPatient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        patientCode,
        roomId: moveRoomId,
        dateOfBirth: dateOfBirth || null,
        nrc: nrc || null,
        residentialArea: residentialArea || null,
        sex: sex || null,
        admissionReason: admissionReason || null,
        nextOfKinFullName: nextOfKinFullName || null,
        nextOfKinResidentialArea: nextOfKinResidentialArea || null,
        nextOfKinPhone: nextOfKinPhone || null,
        nextOfKinRelation: nextOfKinRelation || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Update failed");
      return;
    }
    setEditPatient(null);
    router.refresh();
  }

  async function dischargePatient(patient: PatientRow) {
    if (
      !confirm(
        `Discharge ${patient.fullName}? The bed will free; history is kept.`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/patients/${patient.id}/discharge`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert((data as { error?: string }).error || "Discharge failed");
      return;
    }
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
    setApiKeyOnce((data as { device: { apiKey: string } }).device.apiKey);
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
            ← {wardName} beds
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
            Bed {roomNumber}
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
              setFullName("");
              setAge("");
              setSex("");
              setAdmissionReason("");
              setError("");
            }}
            className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white hover:bg-brand"
          >
            Admit patient
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
          No patients in this bed yet.
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
                {canManage && (
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                )}
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
                    <div className="space-y-1">
                      <ScoreBadge level={p.status} total={p.scoreTotal} />
                      <p className="text-[11px] text-ink-muted">
                        {p.lastReadingAge
                          ? `Reading ${p.lastReadingAge}`
                          : "No readings"}
                        {p.lastSeenAge ? ` · seen ${p.lastSeenAge}` : ""}
                      </p>
                    </div>
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
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded p-1.5 text-ink-muted hover:bg-brand-soft hover:text-brand"
                          aria-label={`Edit ${p.fullName}`}
                          onClick={() => {
                            setEditPatient(p);
                            setFullName(p.fullName);
                            setPatientCode(p.patientCode);
                            setDateOfBirth(p.dateOfBirth ?? "");
                            setNrc(p.nrc ?? "");
                            setResidentialArea(p.residentialArea ?? "");
                            setSex(p.sex ?? "");
                            setAdmissionReason(p.admissionReason ?? "");
                            setNextOfKinFullName(p.nextOfKinFullName ?? "");
                            setNextOfKinResidentialArea(
                              p.nextOfKinResidentialArea ?? "",
                            );
                            setNextOfKinPhone(p.nextOfKinPhone ?? "");
                            setNextOfKinRelation(p.nextOfKinRelation ?? "");
                            setMoveRoomId(roomId);
                            setError("");
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1.5 text-ink-muted hover:bg-alert-soft hover:text-alert"
                          aria-label={`Discharge ${p.fullName}`}
                          onClick={() => dischargePatient(p)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Admit patient" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={createPatient} className="space-y-4">
          <p className="text-xs text-ink-muted">
            Admitting to {wardName} · Bed {roomNumber}
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Date of birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                className="w-full rounded-lg border border-line bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">NRC</label>
              <input
                value={nrc}
                onChange={(e) => setNrc(e.target.value)}
                required
                className="w-full rounded-lg border border-line bg-white px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Residential area
            </label>
            <input
              value={residentialArea}
              onChange={(e) => setResidentialArea(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-white px-3 py-2"
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Sex</label>
              <input
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                placeholder="F / M / Other"
                className="w-full rounded-lg border border-line bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Reason for admission
              </label>
              <input
                value={admissionReason}
                onChange={(e) => setAdmissionReason(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2"
              />
            </div>
          </div>

          <div className="border-t border-line pt-3">
            <p className="mb-3 text-sm font-semibold text-ink">Next of kin</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Full name
                </label>
                <input
                  value={nextOfKinFullName}
                  onChange={(e) => setNextOfKinFullName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-line bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Residential area
                </label>
                <input
                  value={nextOfKinResidentialArea}
                  onChange={(e) => setNextOfKinResidentialArea(e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Phone number
                  </label>
                  <input
                    value={nextOfKinPhone}
                    onChange={(e) => setNextOfKinPhone(e.target.value)}
                    required
                    className="w-full rounded-lg border border-line bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Relation
                  </label>
                  <input
                    value={nextOfKinRelation}
                    onChange={(e) => setNextOfKinRelation(e.target.value)}
                    placeholder="Spouse, parent…"
                    className="w-full rounded-lg border border-line bg-white px-3 py-2"
                  />
                </div>
              </div>
            </div>
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
              Admit
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="Edit patient"
        open={Boolean(editPatient)}
        onClose={() => setEditPatient(null)}
      >
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Date of birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">NRC</label>
              <input
                value={nrc}
                onChange={(e) => setNrc(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Residential area
            </label>
            <input
              value={residentialArea}
              onChange={(e) => setResidentialArea(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2"
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
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Bed</label>
            <select
              value={moveRoomId}
              onChange={(e) => setMoveRoomId(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
            >
              {wardRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Bed {r.number}
                </option>
              ))}
            </select>
          </div>
          <div className="border-t border-line pt-3">
            <p className="mb-3 text-sm font-semibold text-ink">Next of kin</p>
            <div className="space-y-3">
              <input
                value={nextOfKinFullName}
                onChange={(e) => setNextOfKinFullName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-lg border border-line bg-white px-3 py-2"
              />
              <input
                value={nextOfKinResidentialArea}
                onChange={(e) => setNextOfKinResidentialArea(e.target.value)}
                placeholder="Residential area"
                className="w-full rounded-lg border border-line bg-white px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={nextOfKinPhone}
                  onChange={(e) => setNextOfKinPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full rounded-lg border border-line bg-white px-3 py-2"
                />
                <input
                  value={nextOfKinRelation}
                  onChange={(e) => setNextOfKinRelation(e.target.value)}
                  placeholder="Relation"
                  className="w-full rounded-lg border border-line bg-white px-3 py-2"
                />
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditPatient(null)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
