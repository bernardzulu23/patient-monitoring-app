"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  WardOverviewGrid,
  type WardSummary,
} from "@/components/ward-overview-grid";

const POLL_MS = 4000;

export function WardOverviewLive({
  initial,
  isAdmin,
}: {
  initial: WardSummary[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [wards, setWards] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setWards(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/dashboard/wards", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { wards: WardSummary[] };
        if (!cancelled) {
          setWards(data.wards);
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
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error || "Create failed");
      return;
    }
    setOpenNew(false);
    setName("");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Wards
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Overview with NEWS2-inspired scoring · polls every 4s
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
              className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white hover:bg-brand"
            >
              New Ward
            </button>
          )}
        </div>
      </div>

      <WardOverviewGrid wards={wards} isAdmin={isAdmin} />

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
