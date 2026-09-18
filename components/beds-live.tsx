"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScoreBadge } from "@/components/score-badge";
import { VitalChip } from "@/components/vital-chip";
import type { BedCard } from "@/lib/data";

const POLL_MS = 4000;

export function BedsLive({ initial }: { initial: BedCard[] }) {
  const [beds, setBeds] = useState(initial);
  const [wardFilter, setWardFilter] = useState("all");
  const [occupancy, setOccupancy] = useState<
    "all" | "occupied" | "empty" | "RESERVED" | "CLEANING"
  >("all");
  const [alertOnly, setAlertOnly] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    setBeds(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/dashboard/beds", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { beds: BedCard[] };
        if (!cancelled) {
          setBeds(data.beds);
          setUpdatedAt(new Date());
        }
      } catch {
        // keep snapshot
      }
    }
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const wards = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of beds) map.set(b.wardId, b.wardName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [beds]);

  const filtered = beds.filter((b) => {
    if (wardFilter !== "all" && b.wardId !== wardFilter) return false;
    if (occupancy === "occupied" && b.occupancy !== "occupied") return false;
    if (occupancy === "empty" && b.bedStatus !== "EMPTY") return false;
    if (occupancy === "RESERVED" && b.bedStatus !== "RESERVED") return false;
    if (occupancy === "CLEANING" && b.bedStatus !== "CLEANING") return false;
    if (
      alertOnly &&
      b.openAlerts === 0 &&
      b.status !== "URGENT" &&
      b.status !== "LOW" &&
      b.status !== "OFFLINE"
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Beds</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Bed-level vitals · polls every 4s · Room = bed in this hospital
          </p>
        </div>
        <p className="text-xs text-ink-muted tabular-nums">
          {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Live"}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="all">All wards</option>
          {wards.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={occupancy}
          onChange={(e) =>
            setOccupancy(
              e.target.value as
                | "all"
                | "occupied"
                | "empty"
                | "RESERVED"
                | "CLEANING",
            )
          }
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="all">All beds</option>
          <option value="occupied">Occupied</option>
          <option value="empty">Empty</option>
          <option value="RESERVED">Reserved</option>
          <option value="CLEANING">Cleaning</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={alertOnly}
            onChange={(e) => setAlertOnly(e.target.checked)}
          />
          Needs attention
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bed) => (
          <BedTile key={bed.roomId} bed={bed} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-ink-muted">No beds match these filters.</p>
      )}
    </div>
  );
}

function BedTile({ bed }: { bed: BedCard }) {
  const border =
    bed.status === "URGENT" || bed.openAlerts > 0
      ? "border-alert"
      : bed.status === "LOW"
        ? "border-warn"
        : bed.status === "OFFLINE"
          ? "border-ink-muted"
          : "border-line";

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {bed.wardName}
          </p>
          <h2 className="text-lg font-semibold text-ink">
            Bed {bed.roomNumber}
          </h2>
          <p className="text-[11px] uppercase tracking-wide text-ink-muted">
            {bed.bedStatus}
          </p>
        </div>
        <ScoreBadge level={bed.status} total={bed.scoreTotal} />
      </div>
      {bed.occupancy === "empty" ? (
        <p className="mt-3 text-sm text-ink-muted">Empty</p>
      ) : (
        <>
          <p className="mt-3 font-medium text-ink">{bed.patientName}</p>
          <p className="text-xs text-ink-muted">
            {bed.patientCode}
            {bed.age != null ? ` · ${bed.age}y` : ""}
            {bed.sex ? ` · ${bed.sex}` : ""}
            {bed.lastReadingAge ? ` · ${bed.lastReadingAge}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <VitalChip label="HR" value={bed.heartRate} unit="bpm" />
            <VitalChip label="SpO₂" value={bed.spo2} unit="%" />
            <VitalChip label="Temp" value={bed.tempC} unit="°C" digits={1} />
            <VitalChip label="RR" value={bed.respiratoryRate} unit="/min" />
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">
            BP{" "}
            {bed.systolic != null && bed.diastolic != null
              ? `${bed.systolic}/${bed.diastolic}`
              : "—"}
            {bed.bpMeasuredAge
              ? ` · measured ${bed.bpMeasuredAge}`
              : " · not continuous"}
            {bed.openAlerts > 0 ? ` · ${bed.openAlerts} open alert(s)` : ""}
          </p>
        </>
      )}
      {!bed.hasDevice && bed.occupancy === "occupied" && (
        <p className="mt-2 text-xs text-warn">No device linked</p>
      )}
    </>
  );

  if (bed.patientId) {
    return (
      <Link
        href={`/dashboard/patients/${bed.patientId}`}
        className={`block rounded-xl border bg-surface p-4 transition hover:shadow-sm ${border}`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={`rounded-xl border bg-surface p-4 ${border}`}>{inner}</div>
  );
}
