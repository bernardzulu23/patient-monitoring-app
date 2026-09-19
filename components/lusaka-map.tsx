const LUSAKA_EMBED =
  "https://www.openstreetmap.org/export/embed.html?bbox=28.20%2C-15.50%2C28.40%2C-15.30&layer=mapnik&marker=-15.4167%2C28.2833";

export function LusakaMap({
  title = "Location — Lusaka, Zambia",
  className = "",
}: {
  title?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {title && (
        <h2 className="mb-4 font-display text-2xl font-semibold text-[var(--pm-ink)] sm:text-3xl">
          {title}
        </h2>
      )}
      <div className="overflow-hidden border border-[var(--pm-line)] bg-white">
        <iframe
          title="Map of Lusaka, Zambia"
          src={LUSAKA_EMBED}
          className="h-64 w-full border-0 sm:h-80"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className="mt-2 text-sm text-[var(--pm-muted)]">
        OpenStreetMap · Lusaka area (prototype project location)
      </p>
    </div>
  );
}
