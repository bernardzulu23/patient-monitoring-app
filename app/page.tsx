import Link from "next/link";
import {
  Activity,
  Bell,
  BookOpen,
  FileText,
  LayoutGrid,
  LineChart,
  MapPinned,
  Shield,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { InquiryStrip } from "@/components/inquiry-strip";
import { LusakaMap } from "@/components/lusaka-map";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import {
  getGalleryImageMetas,
  getHeroImageMeta,
  publicImageUrl,
} from "@/lib/landing";
import { getSession } from "@/lib/session";

const FEATURES = [
  {
    icon: Activity,
    title: "Live vitals",
    body: "Heart rate, SpO₂, temperature, and blood pressure streamed to the ward dashboard.",
  },
  {
    icon: Bell,
    title: "Threshold alerts",
    body: "Instant alerts when readings breach configured thresholds, with acknowledge workflow.",
  },
  {
    icon: Shield,
    title: "Role-based access",
    body: "Admin, doctor, and nurse roles with ward-scoped permissions where required.",
  },
  {
    icon: LayoutGrid,
    title: "Ward & bed management",
    body: "Organize patients by ward and bed so staff see the right beds at a glance.",
  },
  {
    icon: WifiOff,
    title: "Offline resilience",
    body: "When WiFi drops, readings can still arrive via SMS fallback into the same pipeline.",
  },
  {
    icon: LineChart,
    title: "Vital trends",
    body: "Historical charts on the patient view so staff can review change over time.",
  },
  {
    icon: FileText,
    title: "Working contact form",
    body: "Evaluator inquiries post to the live contact API and land in the admin inbox.",
  },
  {
    icon: MapPinned,
    title: "Lusaka map",
    body: "Embedded map on the home and contact pages for the project location.",
  },
  {
    icon: Smartphone,
    title: "Responsive layout",
    body: "Works on phone and desktop so reviewers can open the prototype anywhere.",
  },
  {
    icon: BookOpen,
    title: "Documentation",
    body: "Architecture and data-protection notes for supervisors on the Docs page.",
  },
];

export default async function HomePage() {
  let session = null;
  let hero: Awaited<ReturnType<typeof getHeroImageMeta>> = null;
  let gallery: Awaited<ReturnType<typeof getGalleryImageMetas>> = [];

  try {
    session = await getSession();
  } catch {
    session = null;
  }

  try {
    [hero, gallery] = await Promise.all([
      getHeroImageMeta(),
      getGalleryImageMetas(4),
    ]);
  } catch {
    hero = null;
    gallery = [];
  }

  const heroSrc = hero ? publicImageUrl(hero.id) : null;

  return (
    <div className="public-marketing min-h-screen">
      <PublicHeader signedIn={Boolean(session)} />

      <section className="relative min-h-[70vh] overflow-hidden sm:min-h-[78vh]">
        {heroSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 atmosphere-clinical" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,74,122,0.35)_0%,rgba(6,74,122,0.45)_45%,rgba(6,74,122,0.72)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-6 pb-24 pt-16 text-center sm:min-h-[78vh]">
          <h1 className="animate-hero font-display text-4xl font-medium italic leading-[1.15] tracking-tight text-[#ffffff] sm:text-5xl md:text-6xl">
            Real-time vitals when the ward WiFi fails
          </h1>
          <p
            className="animate-hero mt-5 max-w-xl text-base leading-relaxed text-[#f0f7fc] sm:text-lg"
            style={{ animationDelay: "120ms" }}
          >
            Patient Monitor streams bedside HR, SpO₂, temperature, and blood
            pressure — with SMS fallback into the same clinical pipeline.
          </p>
          <div className="animate-hero mt-8" style={{ animationDelay: "220ms" }}>
            <Link
              href={session ? "/dashboard" : "/login"}
              className="inline-flex bg-[#ffffff] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-[#064a7a] transition hover:bg-[#e8f3fa]"
            >
              {session ? "Open dashboard" : "Sign In"}
            </Link>
          </div>
        </div>
      </section>

      <InquiryStrip />

      <section className="bg-white px-6 pb-16 pt-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-3xl font-semibold italic text-[var(--pm-ink)] sm:text-4xl">
            What this system does
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[var(--pm-muted)]">
            Capabilities that exist in the working application — not a vendor wishlist.
          </p>
          <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="text-center sm:text-left">
                <f.icon
                  className="mx-auto h-10 w-10 stroke-[1.25] text-[var(--pm-muted)] sm:mx-0"
                  aria-hidden
                />
                <h3 className="mt-4 font-display text-lg italic text-[var(--pm-ink)]">
                  {f.title}
                </h3>
                <div className="mx-auto mt-2 h-0.5 w-10 bg-[var(--pm-blue)] sm:mx-0" />
                <p className="mt-3 text-sm leading-relaxed text-[var(--pm-muted)]">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#0b6eb5] px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-base leading-relaxed text-[#ffffff] sm:text-lg">
            Built for a real ward connectivity gap — an engineering prototype,
            not a clinically validated medical device.
          </p>
          <Link
            href="/about"
            className="shrink-0 border-2 border-[#ffffff] bg-[#ffffff] px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#0b6eb5] transition hover:bg-transparent hover:text-[#ffffff]"
          >
            Learn more
          </Link>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="bg-[var(--pm-bg)] px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-semibold text-[var(--pm-ink)] sm:text-4xl">
              Project highlights
            </h2>
            <p className="mt-2 text-sm text-[var(--pm-muted)]">
              Admin-uploaded gallery images — not a news blog.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {gallery.map((img) => (
                <div key={img.id} className="overflow-hidden bg-white shadow-sm">
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

      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <LusakaMap />
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
