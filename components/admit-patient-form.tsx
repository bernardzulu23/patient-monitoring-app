"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyOnceBlock } from "@/components/copy-once-block";
import { offlineAwareFetch } from "@/lib/offline-outbox";
import type { AdmitBedOption } from "@/lib/data";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function AdmitPatientForm({
  beds,
  suggestedCode,
}: {
  beds: AdmitBedOption[];
  suggestedCode: string;
}) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(beds[0]?.roomId ?? "");
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiKeyOnce, setApiKeyOnce] = useState<string | null>(null);
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);

  const selected = beds.find((b) => b.roomId === roomId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) {
      setError("Select a bed");
      return;
    }
    setBusy(true);
    setError("");
    const res = await offlineAwareFetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        fullName,
        patientCode,
        dateOfBirth,
        nrc,
        residentialArea,
        sex: sex || null,
        admissionReason,
        nextOfKinFullName,
        nextOfKinResidentialArea: nextOfKinResidentialArea || null,
        nextOfKinPhone,
        nextOfKinRelation: nextOfKinRelation || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 202 && (data as { queued?: boolean }).queued) {
      setError("");
      setCreatedPatientId("queued");
      return;
    }
    if (!res.ok) {
      setError((data as { error?: string }).error || "Registration failed");
      return;
    }
    const id = (data as { patient: { id: string } }).patient.id;
    setCreatedPatientId(id);
    router.refresh();
  }

  async function addDevice() {
    if (!createdPatientId || createdPatientId === "queued") return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/patients/${createdPatientId}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Device register failed");
      return;
    }
    setApiKeyOnce(
      (data as { device?: { apiKey?: string }; apiKey?: string }).device
        ?.apiKey ??
        (data as { apiKey?: string }).apiKey ??
        null,
    );
  }

  if (beds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center text-sm text-ink-muted">
        No empty beds available to register a patient. Free a bed from{" "}
        <Link href="/dashboard/beds" className="text-brand underline">
          Beds
        </Link>{" "}
        or discharge a patient first.
      </div>
    );
  }

  if (createdPatientId) {
    if (createdPatientId === "queued") {
      return (
        <div className="rounded-xl border border-amber-700/30 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-medium">Saved offline</p>
          <p className="mt-1">
            Registration will sync automatically when this device reconnects to
            the hospital server.
          </p>
          <button
            type="button"
            onClick={() => {
              setCreatedPatientId(null);
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
              setPatientCode(suggestedCode);
              setError("");
            }}
            className="mt-3 font-semibold underline"
          >
            Register another
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-brand/30 bg-brand-soft/40 px-4 py-4 text-sm">
          <p className="font-medium text-ink">Patient registered.</p>
          <p className="mt-1 text-ink-muted">
            {selected
              ? `${selected.wardName} · Bed ${selected.roomNumber}`
              : null}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href={`/dashboard/patients/${createdPatientId}`}
              className="font-semibold text-brand-deep underline"
            >
              Open patient chart
            </Link>
            {!apiKeyOnce && (
              <button
                type="button"
                onClick={addDevice}
                disabled={busy}
                className="font-semibold text-brand-deep underline disabled:opacity-60"
              >
                Add device &amp; show API key once
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setCreatedPatientId(null);
                setApiKeyOnce(null);
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
                setPatientCode(suggestedCode);
                setError("");
                router.refresh();
              }}
              className="text-ink-muted underline"
            >
              Register another
            </button>
          </div>
        </div>
        {apiKeyOnce && (
          <CopyOnceBlock
            value={apiKeyOnce}
            warning="Save this device API key now — it will not be shown again. Flash it to the ESP32 firmware as x-api-key."
          />
        )}
        {error && <p className="text-sm text-alert">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-line bg-surface p-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Bed</label>
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          required
          className={inputClass}
        >
          {beds.map((b) => (
            <option key={b.roomId} value={b.roomId}>
              {b.wardName} · Bed {b.roomNumber}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Full name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Date of birth</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">NRC</label>
          <input
            value={nrc}
            onChange={(e) => setNrc(e.target.value)}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Residential address
        </label>
        <input
          value={residentialArea}
          onChange={(e) => setResidentialArea(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Patient code</label>
          <input
            value={patientCode}
            onChange={(e) => setPatientCode(e.target.value)}
            required
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Sex</label>
          <input
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            placeholder="F / M / Other"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Reason for admission
        </label>
        <textarea
          value={admissionReason}
          onChange={(e) => setAdmissionReason(e.target.value)}
          required
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="border-t border-line pt-4">
        <p className="mb-3 text-sm font-semibold text-ink">Next of kin</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full name</label>
            <input
              value={nextOfKinFullName}
              onChange={(e) => setNextOfKinFullName(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Residential address
            </label>
            <input
              value={nextOfKinResidentialArea}
              onChange={(e) => setNextOfKinResidentialArea(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Phone number
              </label>
              <input
                value={nextOfKinPhone}
                onChange={(e) => setNextOfKinPhone(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Relation</label>
              <input
                value={nextOfKinRelation}
                onChange={(e) => setNextOfKinRelation(e.target.value)}
                placeholder="Spouse, parent…"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-alert">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-deep px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
        >
          {busy ? "Registering…" : "Register patient"}
        </button>
      </div>
    </form>
  );
}
