"use client";

import { useState } from "react";

export function PatientThresholdOverrideForm({
  patientId,
}: {
  patientId: string;
}) {
  const [open, setOpen] = useState(false);
  const [spo2Low, setSpo2Low] = useState("");
  const [hrHigh, setHrHigh] = useState("");
  const [tempHigh, setTempHigh] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-brand hover:underline"
      >
        Per-patient threshold overrides
      </button>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/patients/${patientId}/thresholds`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spo2Low: spo2Low === "" ? null : Number(spo2Low),
        hrHigh: hrHigh === "" ? null : Number(hrHigh),
        tempHigh: tempHigh === "" ? null : Number(tempHigh),
      }),
    });
    setBusy(false);
    setMsg(res.ok ? "Overrides saved (blank = hospital default)." : "Save failed");
  }

  async function clear() {
    setBusy(true);
    await fetch(`/api/patients/${patientId}/thresholds`, { method: "DELETE" });
    setBusy(false);
    setSpo2Low("");
    setHrHigh("");
    setTempHigh("");
    setMsg("Overrides cleared.");
  }

  return (
    <form
      onSubmit={save}
      className="mt-4 space-y-3 rounded-xl border border-line bg-surface p-4"
    >
      <p className="text-xs text-ink-muted">
        Optional overrides — leave blank to inherit hospital defaults. Not
        medical advice.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs">
          SpO₂ low
          <input
            value={spo2Low}
            onChange={(e) => setSpo2Low(e.target.value)}
            className="mt-1 w-full rounded border border-line px-2 py-1"
          />
        </label>
        <label className="text-xs">
          HR high
          <input
            value={hrHigh}
            onChange={(e) => setHrHigh(e.target.value)}
            className="mt-1 w-full rounded border border-line px-2 py-1"
          />
        </label>
        <label className="text-xs">
          Temp high
          <input
            value={tempHigh}
            onChange={(e) => setTempHigh(e.target.value)}
            className="mt-1 w-full rounded border border-line px-2 py-1"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-deep px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
        >
          Save overrides
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={busy}
          className="rounded-lg border border-line px-2 py-1 text-xs"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-line px-2 py-1 text-xs"
        >
          Close
        </button>
      </div>
      {msg && <p className="text-xs text-ink-muted">{msg}</p>}
    </form>
  );
}
