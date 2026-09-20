import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { getSession } from "@/lib/session";

export default async function AboutPage() {
  const session = await getSession();

  return (
    <div className="public-marketing min-h-screen">
      <PublicHeader signedIn={Boolean(session)} />
      <main className="mx-auto max-w-3xl px-6 py-16 animate-rise">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--pm-blue)]">
          About
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-[var(--pm-ink)]">
          Built for a real ward connectivity gap
        </h1>
        <div className="mt-8 space-y-6 text-base leading-relaxed text-[var(--pm-muted)]">
          <p>
            Patient Monitoring System started as an ICU-focused final-year engineering
            project: conti  nuous bedside vital-sign monitoring for wards where
            manual rounds are infrequent and connectivity is unreliable.
          </p>
          <p>
            The problem is plain. Manual vitals rounds are infrequent, and many
            wards face unreliable WiFi and power. A dashboard that only works on
            a perfect network is not enough — so the software is designed around
            HTTPS ingest first, with an SMS fallback path into the same reading
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
            Location:{" "}
            <strong className="text-[var(--pm-ink)]">Lusaka, Zambia</strong>.
            Staff accounts are issued by an administrator — there is no public
            self-registration.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/docs"
            className="text-sm font-semibold text-[var(--pm-blue)] hover:underline"
          >
            Evaluator documentation →
          </Link>
          <Link
            href="/contact"
            className="text-sm font-semibold text-[var(--pm-blue)] hover:underline"
          >
            Contact →
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
