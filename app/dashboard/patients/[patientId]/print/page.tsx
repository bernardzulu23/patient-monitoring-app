import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { ScoreBadge } from "@/components/score-badge";
import {
  getPatientDetail,
  requireSession,
  serializePatientDetail,
} from "@/lib/data";
import { resolveMonitorStatus } from "@/lib/ingestReading";

export default async function PatientPrintPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const session = await requireSession();
  const patient = await getPatientDetail(session, patientId);
  if (!patient) notFound();

  const data = serializePatientDetail(patient);
  const device = patient.devices[0];
  const resolved = resolveMonitorStatus({
    hasDevice: Boolean(device),
    lastSeen: device?.lastSeen,
    reading: device?.readings[0] ?? null,
  });

  return (
    <div className="mx-auto max-w-3xl bg-white px-8 py-10 text-ink print:px-0">
      <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
        <Link
          href={`/dashboard/patients/${patientId}`}
          className="text-sm text-brand hover:underline"
        >
          ← Back to patient
        </Link>
        <PrintButton />
      </div>

      <header className="border-b border-line pb-4">
        <p className="text-xs uppercase tracking-wide text-ink-muted">
          Patient summary
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          {data.fullName}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {data.patientCode}
          {data.age != null ? ` · ${data.age}y` : ""}
          {data.sex ? ` · ${data.sex}` : ""} · {data.wardName} · Bed{" "}
          {data.roomNumber}
        </p>
        <div className="mt-2">
          <ScoreBadge level={resolved.status} total={data.latestScore?.total} />
        </div>
      </header>

      <section className="mt-6 grid gap-2 text-sm">
        <p>
          <span className="text-ink-muted">Status:</span> {data.patientStatus}
        </p>
        <p>
          <span className="text-ink-muted">Admitted:</span>{" "}
          {new Date(data.admittedAt).toLocaleString()}
        </p>
        {data.admissionReason && (
          <p>
            <span className="text-ink-muted">Reason:</span>{" "}
            {data.admissionReason}
          </p>
        )}
        {data.admittingDoctor && (
          <p>
            <span className="text-ink-muted">Admitting doctor:</span>{" "}
            {data.admittingDoctor.name}
          </p>
        )}
        {data.assignedNurse && (
          <p>
            <span className="text-ink-muted">Assigned nurse:</span>{" "}
            {data.assignedNurse.name}
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Latest vitals
        </h2>
        {data.latest ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-ink-muted">HR</dt>
              <dd className="font-semibold tabular-nums">
                {data.latest.heartRate ?? "—"} bpm
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">SpO₂</dt>
              <dd className="font-semibold tabular-nums">
                {data.latest.spo2 ?? "—"} %
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Temp</dt>
              <dd className="font-semibold tabular-nums">
                {data.latest.tempC != null
                  ? `${data.latest.tempC.toFixed(1)} °C`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">RR</dt>
              <dd className="font-semibold tabular-nums">
                {data.latest.respiratoryRate ?? "—"} /min
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">BP (measured)</dt>
              <dd className="font-semibold tabular-nums">
                {data.bp ? `${data.bp.systolic}/${data.bp.diastolic}` : "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">No readings.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Recent alerts
        </h2>
        <ul className="mt-3 space-y-1 text-sm">
          {data.alerts.slice(0, 15).map((a) => (
            <li key={a.id}>
              {new Date(a.createdAt).toLocaleString()} · {a.alertType}
              {a.status ? ` · ${a.status}` : ""}
              {a.value != null ? ` · ${a.value}` : ""}
            </li>
          ))}
          {data.alerts.length === 0 && (
            <li className="text-ink-muted">No alerts.</li>
          )}
        </ul>
      </section>

      <p className="mt-10 text-xs text-ink-muted">
        Prototype summary · NEWS2-inspired scoring is not full NEWS2 · Generated{" "}
        {new Date().toLocaleString()}
      </p>
    </div>
  );
}
