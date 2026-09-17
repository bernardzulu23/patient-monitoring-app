import type { MonitorStatus } from "@/lib/ingestReading";

export function ScoreBadge({
  level,
  total,
}: {
  level: MonitorStatus;
  total?: number;
}) {
  const styles =
    level === "URGENT"
      ? "bg-alert-soft text-alert"
      : level === "LOW"
        ? "bg-warn-soft text-warn"
        : level === "OFFLINE"
          ? "bg-ink-muted/15 text-ink-muted"
          : level === "NO_DATA"
            ? "bg-ink-muted/10 text-ink-muted"
            : "bg-ok-soft text-ok";

  const label =
    level === "NORMAL"
      ? "Clear"
      : level === "LOW"
        ? "Low"
        : level === "URGENT"
          ? "Urgent"
          : level === "OFFLINE"
            ? "Offline"
            : "No data";

  const showTotal =
    typeof total === "number" &&
    (level === "NORMAL" || level === "LOW" || level === "URGENT");

  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${styles}`}
      title="NEWS2-inspired aggregate (not full NEWS2)"
    >
      {label}
      {showTotal ? ` · ${total}` : ""}
    </span>
  );
}
