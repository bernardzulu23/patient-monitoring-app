import Link from "next/link";

export type WardSummary = {
  id: string;
  name: string;
  patientCount: number;
  openAlerts: number;
  onlineDevices: number;
  deviceCount: number;
};

export function WardOverviewGrid({ wards }: { wards: WardSummary[] }) {
  if (wards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
        <p className="font-medium text-ink">No wards yet</p>
        <p className="mt-2 text-sm text-ink-muted">
          Run the database migrate and seed script to create demo wards,
          nurses, and devices.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {wards.map((ward, i) => (
        <Link
          key={ward.id}
          href={`/dashboard/wards/${ward.id}`}
          className="group rounded-xl border border-line bg-surface p-5 transition hover:border-brand hover:shadow-[0_12px_32px_-20px_rgba(8,78,75,0.5)] animate-rise"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink group-hover:text-brand-deep">
              {ward.name}
            </h2>
            {ward.openAlerts > 0 ? (
              <span className="rounded-md bg-alert-soft px-2 py-0.5 text-xs font-semibold text-alert">
                {ward.openAlerts} alert{ward.openAlerts === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="rounded-md bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">
                Clear
              </span>
            )}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
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
      ))}
    </div>
  );
}
