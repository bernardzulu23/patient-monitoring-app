"use client";

type Point = { t: number; v: number };

export function Sparkline({
  points,
  color = "#0b6e6a",
  height = 120,
  unit = "",
  asOf,
}: {
  points: Point[];
  color?: string;
  height?: number;
  unit?: string;
  asOf?: string | null;
}) {
  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-line bg-bg/40 text-sm text-ink-muted"
        style={{ height }}
      >
        Not enough readings for a chart yet
      </div>
    );
  }

  const width = 560;
  const padX = 36;
  const padY = 18;
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (p.v - min) / span) * (height - padY * 2);
    return `${x},${y}`;
  });

  const firstT = points[0]!.t;
  const lastT = points[points.length - 1]!.t;
  const formatAxisTime = (t: number) =>
    new Date(t).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible rounded-lg border border-line bg-white"
        role="img"
        aria-label="Vital signs trend"
      >
        <text
          x={8}
          y={padY + 4}
          className="fill-ink-muted"
          style={{ fontSize: 11 }}
        >
          {max.toFixed(unit === "%" || unit === "bpm" ? 0 : 1)}
          {unit}
        </text>
        <text
          x={8}
          y={height - padY + 4}
          className="fill-ink-muted"
          style={{ fontSize: 11 }}
        >
          {min.toFixed(unit === "%" || unit === "bpm" ? 0 : 1)}
          {unit}
        </text>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={coords.join(" ")}
        />
      </svg>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-muted">
        <span>{formatAxisTime(firstT)}</span>
        <span>
          {asOf ? `as of ${asOf}` : formatAxisTime(lastT)}
        </span>
      </div>
    </div>
  );
}
