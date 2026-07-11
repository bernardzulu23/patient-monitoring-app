import type { ScoreLevel } from "@/lib/vitalScore";

export function ScoreBadge({
  level,
  total,
}: {
  level: ScoreLevel;
  total?: number;
}) {
  const styles =
    level === "URGENT"
      ? "bg-alert-soft text-alert"
      : level === "LOW"
        ? "bg-warn-soft text-warn"
        : "bg-ok-soft text-ok";

  const label =
    level === "NORMAL" ? "Clear" : level === "LOW" ? "Low" : "Urgent";

  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${styles}`}
      title="NEWS2-inspired aggregate (not full NEWS2)"
    >
      {label}
      {typeof total === "number" ? ` · ${total}` : ""}
    </span>
  );
}
