import Link from "next/link";
import { notFound } from "next/navigation";
import { getWardDetail, requireSession } from "@/lib/data";
import { VitalChip } from "@/components/vital-chip";

export default async function WardDetailPage({
  params,
}: {
  params: Promise<{ wardId: string }>;
}) {
  const { wardId } = await params;
  const session = await requireSession();
  const ward = await getWardDetail(session, wardId);
  if (!ward) notFound();

  return (
    <div className="animate-rise">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-brand hover:underline"
        >
          ← All wards
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          {ward.name}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {ward.patients.length} patient
          {ward.patients.length === 1 ? "" : "s"}
        </p>
      </div>

      {ward.patients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center text-sm text-ink-muted">
          No patients admitted to this ward yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-bg/60 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Latest vitals</th>
                <th className="px-4 py-3 font-medium">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {ward.patients.map((patient) => {
                const device = patient.devices[0];
                const reading = device?.readings[0];
                const alerts = device?.alerts.length ?? 0;

                return (
                  <tr
                    key={patient.id}
                    className="border-b border-line/70 last:border-0 hover:bg-brand-soft/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/patients/${patient.id}`}
                        className="font-medium text-ink hover:text-brand"
                      >
                        {patient.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {patient.patientCode}
                    </td>
                    <td className="px-4 py-3">
                      {reading ? (
                        <div className="flex flex-wrap gap-1.5">
                          <VitalChip
                            label="HR"
                            value={reading.heartRate}
                            unit="bpm"
                          />
                          <VitalChip label="SpO₂" value={reading.spo2} unit="%" />
                          <VitalChip
                            label="Temp"
                            value={reading.tempC}
                            unit="°C"
                            digits={1}
                          />
                          <VitalChip
                            label="BP"
                            value={
                              reading.systolic != null && reading.diastolic != null
                                ? `${reading.systolic}/${reading.diastolic}`
                                : null
                            }
                          />
                        </div>
                      ) : (
                        <span className="text-ink-muted">No readings yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {alerts > 0 ? (
                        <span className="rounded-md bg-alert-soft px-2 py-0.5 text-xs font-semibold text-alert">
                          {alerts}
                        </span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
