export function VitalChip({
  label,
  value,
  unit,
  digits,
}: {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  digits?: number;
}) {
  if (value == null || value === "") {
    return null;
  }

  const display =
    typeof value === "number" && digits != null
      ? value.toFixed(digits)
      : String(value);

  return (
    <span className="inline-flex items-baseline gap-1 rounded-md border border-line bg-white px-2 py-0.5 text-xs">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold tabular-nums text-ink">
        {display}
        {unit ? (
          <span className="ml-0.5 font-normal text-ink-muted">{unit}</span>
        ) : null}
      </span>
    </span>
  );
}
