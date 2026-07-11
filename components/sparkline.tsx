"use client";

type Point = { t: number; v: number };

export function Sparkline({
  points,
  color = "#0b6e6a",
  height = 120,
}: {
  points: Point[];
  color?: string;
  height?: number;
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
  const pad = 8;
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (p.v - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full overflow-visible rounded-lg border border-line bg-white"
      role="img"
      aria-label="Vital signs trend"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords.join(" ")}
      />
    </svg>
  );
}
