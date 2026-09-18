import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { getSession } from "@/lib/session";

export default async function AboutPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-bg">
      <PublicHeader signedIn={Boolean(session)} />
      <main className="mx-auto max-w-3xl px-6 py-16 animate-rise">
        <p className="text-sm font-medium uppercase tracking-wide text-brand">
          About
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
          Built for a real ward connectivity gap
        </h1>
        <div className="mt-8 space-y-6 text-base leading-relaxed text-ink-muted">
          <p>
            Patient Monitor started as an ICU-focused final-year engineering
            project: an ESP32 bedside unit with a MAX30102 (heart rate and
            SpO₂), DS18B20 temperature probe, NIBP module for blood pressure, a
            small LCD, and a SIM800L GSM modem for fallback connectivity.
          </p>
          <p>
            The problem is plain. Manual vitals rounds are infrequent, and many
            wards face unreliable WiFi and power. A dashboard that only works on
            a perfect network is not enough — so the software is designed around
            HTTPS ingest first, with an SMS webhook path into the same reading
            pipeline when WiFi fails.
          </p>
          <p className="rounded-lg border border-warn bg-warn-soft px-4 py-3 text-warn">
            This is a <strong>prototype / pilot</strong> system for academic and
            engineering demonstration. It is not clinically validated, not
            regulatory-cleared, and not “trusted by hospitals.” Evaluators
            should treat the live site as a working software prototype, not a
            finished medical device.
          </p>
          <p>
            Location: <strong className="text-ink">Lusaka, Zambia</strong>.
            Staff accounts are issued by an administrator — there is no public
            self-registration.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/docs"
            className="text-sm font-semibold text-brand hover:underline"
          >
            Evaluator documentation →
          </Link>
          <Link
            href="/contact"
            className="text-sm font-semibold text-brand hover:underline"
          >
            Contact →
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
