"use client";

import { useEffect, useState } from "react";
import {
  WardOverviewGrid,
  type WardSummary,
} from "@/components/ward-overview-grid";

const POLL_MS = 4000;

export function WardOverviewLive({ initial }: { initial: WardSummary[] }) {
  const [wards, setWards] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

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
        // keep last good snapshot
      }
    }

    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Wards
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Overview of patients and recent alerts
          </p>
        </div>
        <p className="text-xs text-ink-muted tabular-nums">
          {updatedAt
            ? `Updated ${updatedAt.toLocaleTimeString()}`
            : "Live · polls every 4s"}
        </p>
      </div>
      <WardOverviewGrid wards={wards} />
    </div>
  );
}
