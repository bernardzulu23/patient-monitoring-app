import Link from "next/link";
import {
  getGalleryImageMetas,
  getHeroImageMeta,
  publicImageUrl,
} from "@/lib/landing";
import { getSession } from "@/lib/session";

export default async function LandingPage() {
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
            className="absolute inset-0 h-full w-full object-cover animate-rise"
          />
        ) : (
          <div className="absolute inset-0 atmosphere" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-ink/35 to-ink/20" />
        <div className="pointer-events-none absolute inset-0 atmosphere-grid opacity-30" />

        <div className="relative z-10 mx-auto flex min-h-svh max-w-6xl flex-col justify-end px-6 pb-16 pt-10 sm:pb-24">
          <nav className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-6">
            <p className="font-display text-lg font-semibold tracking-tight text-white">
              Patient Monitor
            </p>
            <Link
              href={session ? "/dashboard" : "/login"}
              className="text-sm font-medium text-white/90 underline-offset-4 hover:underline"
            >
              {session ? "Open dashboard" : "Staff sign in"}
            </Link>
          </nav>

          <div className="max-w-2xl animate-rise" style={{ animationDelay: "80ms" }}>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
              Patient Monitor
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/85 sm:text-xl">
              Live vital signs across hospital wards — clear triage when every
              second matters.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand-deep transition hover:bg-brand-soft"
              >
                {session ? "Go to dashboard" : "Staff sign in"}
              </Link>
              <p className="text-sm text-white/70">
                NEWS2-inspired scoring · ward-level access
              </p>
            </div>
          </div>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="border-t border-line bg-surface px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-semibold text-ink">
              Inside the wards
            </h2>
            <p className="mt-2 max-w-xl text-ink-muted">
              Scenes from the hospital environment your team monitors every day.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {gallery.map((img, i) => (
                <div
                  key={img.id}
                  className="overflow-hidden rounded-lg animate-rise"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
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

      <footer className="border-t border-line bg-bg px-6 py-8 text-center text-sm text-ink-muted">
        Hospital vital-signs monitoring · staff accounts only
      </footer>
    </div>
  );
}
