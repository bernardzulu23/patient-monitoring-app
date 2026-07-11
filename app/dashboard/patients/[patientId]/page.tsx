import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreBadge } from "@/components/score-badge";
import { Sparkline } from "@/components/sparkline";
import { VitalChip } from "@/components/vital-chip";
import { getPatientDetail, requireSession } from "@/lib/data";
import { aggregateScore } from "@/lib/vitalScore";

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
  const latestScore = latest ? aggregateScore(latest) : null;

  const hrPoints = chronological
    .filter((r) => r.heartRate != null)
    .map((r) => ({ t: r.recordedAt.getTime(), v: r.heartRate as number }));

  const spo2Points = chronological
    .filter((r) => r.spo2 != null)
    .map((r) => ({ t: r.recordedAt.getTime(), v: r.spo2 as number }));

  const scoreTrend = chronological
    .map((r) => {
      const s = aggregateScore(r);
      return { t: r.recordedAt.getTime(), v: s.total };
    })
    .filter((p) => p.v > 0 || chronological.length > 0);

  return (
    <div className="animate-rise space-y-8">
      <div>
        <Link
          href={`/dashboard/wards/${patient.room.wardId}/rooms/${patient.roomId}`}
          className="text-sm text-brand hover:underline"
        >
          ← {patient.room.ward.name} · Room {patient.room.number}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold text-ink">
            {patient.fullName}
          </h1>
          {latestScore && (
            <ScoreBadge level={latestScore.level} total={latestScore.total} />
          )}
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {patient.patientCode} · admitted{" "}
          {patient.admittedAt.toLocaleDateString()}
          {device ? ` · ${device.deviceName}` : " · no device"}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Score is NEWS2-inspired (not full NEWS2 — no respiratory rate or
          consciousness).
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

      <section className="grid gap-6 lg:grid-cols-3">
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
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Aggregate score trend
          </h2>
          <Sparkline points={scoreTrend} color="#b8321a" />
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
                <th className="px-4 py-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {readings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-ink-muted"
                  >
                    Waiting for device data…
                  </td>
                </tr>
              ) : (
                readings.slice(0, 20).map((r) => {
                  const s = aggregateScore(r);
                  return (
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
                      <td className="px-4 py-2.5">
                        <ScoreBadge level={s.level} total={s.total} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
