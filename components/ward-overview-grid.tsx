"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { ScoreBadge } from "@/components/score-badge";
import type { ScoreLevel } from "@/lib/vitalScore";

export type WardSummary = {
  id: string;
  name: string;
  patientCount: number;
  roomCount: number;
  openAlerts: number;
  scoreLevel: ScoreLevel;
  onlineDevices: number;
  deviceCount: number;
};

export function WardOverviewGrid({
  wards,
  isAdmin,
}: {
  wards: WardSummary[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const renaming = wards.find((w) => w.id === renameId);

  async function saveRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameId) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/wards/${renameId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error || "Rename failed");
      return;
    }
    setRenameId(null);
    router.refresh();
  }

  async function deleteWard(id: string, name: string) {
    if (!confirm(`Delete ward "${name}"? This only works if it has no rooms.`)) {
      return;
    }
    const res = await fetch(`/api/wards/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert((data as { error?: string }).error || "Delete failed");
      return;
    }
    router.refresh();
  }

  if (wards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
        <p className="font-medium text-ink">No wards yet</p>
        <p className="mt-2 text-sm text-ink-muted">
          {isAdmin
            ? "Create a ward to get started."
            : "Ask an admin to create wards and assign you."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {wards.map((ward, i) => (
          <div
            key={ward.id}
            className="group relative rounded-xl border border-line bg-surface p-5 transition hover:border-brand hover:shadow-[0_12px_32px_-20px_rgba(8,78,75,0.5)] animate-rise"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {isAdmin && (
              <div className="absolute right-3 top-3 flex gap-1 opacity-70 group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded p-1.5 text-ink-muted hover:bg-brand-soft hover:text-brand"
                  aria-label="Rename ward"
                  onClick={() => {
                    setRenameId(ward.id);
                    setRenameValue(ward.name);
                    setError("");
                  }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="rounded p-1.5 text-ink-muted hover:bg-alert-soft hover:text-alert"
                  aria-label="Delete ward"
                  onClick={() => deleteWard(ward.id, ward.name)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            <Link href={`/dashboard/wards/${ward.id}/rooms`} className="block pr-12">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink group-hover:text-brand-deep">
                  {ward.name}
                </h2>
                <ScoreBadge level={ward.scoreLevel} />
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                NEWS2-inspired · worst patient level
              </p>
              <dl className="mt-4 grid grid-cols-4 gap-2 text-sm">
                <div>
                  <dt className="text-ink-muted">Rooms</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                    {ward.roomCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Patients</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                    {ward.patientCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Devices</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                    {ward.deviceCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Online</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-brand">
                    {ward.onlineDevices}
                  </dd>
                </div>
              </dl>
            </Link>
          </div>
        ))}
      </div>

      <Modal
        title="Rename ward"
        open={Boolean(renaming)}
        onClose={() => setRenameId(null)}
      >
        <form onSubmit={saveRename} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Ward name</label>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRenameId(null)}
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
    </>
  );
}
