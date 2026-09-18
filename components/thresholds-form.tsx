"use client";

import { useState } from "react";
import type { ThresholdValues } from "@/lib/thresholds";

export function ThresholdsForm({ initial }: { initial: ThresholdValues }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function setNum(key: keyof ThresholdValues, raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setForm((f) => ({ ...f, [key]: n }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/thresholds", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Save failed");
      return;
    }
    setForm((data as { thresholds: ThresholdValues }).thresholds);
    setMessage("Thresholds saved.");
  }

  const fields: { key: keyof ThresholdValues; label: string }[] = [
    { key: "tempLow", label: "Temp low (°C)" },
    { key: "tempHigh", label: "Temp high (°C)" },
    { key: "hrLow", label: "HR low (bpm)" },
    { key: "hrHigh", label: "HR high (bpm)" },
    { key: "spo2Low", label: "SpO₂ low (%)" },
    { key: "sysLow", label: "Systolic low" },
    { key: "sysHigh", label: "Systolic high" },
    { key: "rrLow", label: "RR low (/min)" },
    { key: "rrHigh", label: "RR high (/min)" },
  ];

  return (
    <form onSubmit={onSave} className="max-w-xl space-y-4">
      <p className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-warn">
        Placeholder clinical ranges — confirm with a medical reference before
        production use. Not medical advice. NEWS2-inspired triage badges remain
        separate from these thresholds.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium">{f.label}</label>
            <input
              type="number"
              step="any"
              value={form[f.key]}
              onChange={(e) => setNum(f.key, e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2"
            />
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-alert">{error}</p>}
      {message && <p className="text-sm text-ok">{message}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save thresholds"}
      </button>
    </form>
  );
}
