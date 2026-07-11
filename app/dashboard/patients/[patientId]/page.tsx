import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatientDetail, requireSession } from "@/lib/data";
import { VitalChip } from "@/components/vital-chip";
import { Sparkline } from "@/components/sparkline";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const session = await requireSession();
  const patient = await getPatientDetail(session, patientId);
  if (!patient) notFound();

  const device = patient.devices[0];
  const readings = device?.readings ?? [];
  const latest = readings[0];
  const chronological = [...readings].reverse();

  const hrPoints = chronological
    .filter((r) => r.heartRate != null)
    .map((r) => ({ t: r.recordedAt.getTime(), v: r.heartRate as number }));

  const spo2Points = chronological
    .filter((r) => r.spo2 != null)
    .map((r) => ({ t: r.recordedAt.getTime(), v: r.spo2 as number }));

  return (
    <div className="animate-rise space-y-8">
      <div>
        <Link
          href={`/dashboard/wards/${patient.wardId}`}
          className="text-sm text-brand hover:underline"
        >
          ← {patient.ward.name}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          {patient.fullName}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {patient.patientCode} · admitted{" "}
          {patient.admittedAt.toLocaleDateString()}
          {device ? ` · ${device.deviceName}` : ""}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Latest vitals
        </h2>
        {latest ? (
          <div className="flex flex-wrap gap-2">
            <VitalChip label="HR" value={latest.heartRate} unit="bpm" />
            <VitalChip label="SpO₂" value={latest.spo2} unit="%" />
            <VitalChip label="Temp" value={latest.tempC} unit="°C" digits={1} />
            <VitalChip
              label="BP"
              value={
                latest.systolic != null && latest.diastolic != null
                  ? `${latest.systolic}/${latest.diastolic}`
                  : null
              }
            />
            <span className="self-center text-xs text-ink-muted">
              {latest.recordedAt.toLocaleString()}
            </span>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No readings recorded yet.</p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Heart rate
          </h2>
          <Sparkline points={hrPoints} color="#0b6e6a" />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            SpO₂
          </h2>
          <Sparkline points={spo2Points} color="#084e4b" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Recent readings
        </h2>
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-bg/60 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">HR</th>
                <th className="px-4 py-3 font-medium">SpO₂</th>
                <th className="px-4 py-3 font-medium">Temp</th>
                <th className="px-4 py-3 font-medium">BP</th>
              </tr>
            </thead>
            <tbody>
              {readings.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-ink-muted"
                  >
                    Waiting for device data…
                  </td>
                </tr>
              ) : (
                readings.slice(0, 20).map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-line/70 last:border-0"
                  >
                    <td className="px-4 py-2.5 tabular-nums text-ink-muted">
                      {r.recordedAt.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.heartRate ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.spo2 ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.tempC != null ? r.tempC.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.systolic != null && r.diastolic != null
                        ? `${r.systolic}/${r.diastolic}`
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {(device?.alerts.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Alerts
          </h2>
          <ul className="space-y-2">
            {device!.alerts.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-alert/20 bg-alert-soft px-4 py-2 text-sm text-alert"
              >
                <span className="font-semibold">{a.alertType}</span>
                <span className="ml-2 text-alert/80">
                  {a.createdAt.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
