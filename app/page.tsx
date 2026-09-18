import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import {
  getGalleryImageMetas,
  getHeroImageMeta,
  publicImageUrl,
} from "@/lib/landing";
import { getSession } from "@/lib/session";

const STEPS = [
  {
    title: "Sensor unit attaches to the patient",
    body: "ESP32 bedside unit with SpO₂/HR, temperature probe, and NIBP cuff.",
  },
  {
    title: "Data streams to the dashboard",
    body: "Primary path is HTTPS over WiFi; when WiFi fails, SIM800L SMS fallback feeds the same pipeline.",
  },
  {
    title: "Staff see color-coded live vitals",
    body: "Ward and bed views poll every few seconds with NEWS2-inspired triage badges.",
  },
  {
    title: "Instant alert on threshold breach",
    body: "Configurable thresholds open an alert until acknowledged or vitals return to range.",
  },
];

const FEATURES = [
  "Live HR, SpO₂, temperature, and blood pressure",
  "Threshold alerts with acknowledge workflow",
  "Role-based access (Admin, Doctor, Nurse)",
  "Ward and bed management",
  "Offline resilience via SMS ingest stub",
  "Historical vital trend charts",
];

export default async function HomePage() {
  const session = await getSession();
  const [hero, gallery] = await Promise.all([
    getHeroImageMeta(),
    getGalleryImageMetas(4),
  ]);
  const heroSrc = hero ? publicImageUrl(hero.id) : null;

  return (
    <div className="min-h-screen bg-bg">
      <section className="relative min-h-svh overflow-hidden">
        {heroSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 atmosphere" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/40 to-ink/25" />
        <PublicHeader signedIn={Boolean(session)} light />

        <div className="relative z-10 mx-auto flex min-h-svh max-w-6xl flex-col justify-end px-6 pb-16 pt-28 sm:pb-24">
          <div className="max-w-2xl animate-rise">
            <p className="text-sm font-medium uppercase tracking-wide text-white/70">
              Bedside monitoring
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
              Real-time bedside vitals with instant threshold alerts
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
              Built for unreliable ward connectivity — when WiFi drops, readings
              can still arrive via SMS fallback into the same clinical pipeline.
            </p>
            <div className="mt-8">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand-deep transition hover:bg-brand-soft"
              >
                {session ? "Open dashboard" : "Sign In"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-semibold text-ink">
            How it works
          </h2>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Four steps from the bedside unit to an actionable alert.
          </p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  Step {i + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-semibold text-ink">
            What this system does
          </h2>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Capabilities that exist in the working application — not a vendor wishlist.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="border-l-2 border-brand pl-4 text-sm leading-relaxed text-ink"
              >
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="border-t border-line bg-surface px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-semibold text-ink">
              Inside the wards
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {gallery.map((img) => (
                <div key={img.id} className="overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicImageUrl(img.id)}
                    alt={img.fileName}
                    className="aspect-4/3 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
}
