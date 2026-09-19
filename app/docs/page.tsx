import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { getSession } from "@/lib/session";

export default async function DocsPage() {
  const session = await getSession();

  return (
    <div className="public-marketing min-h-screen">
      <PublicHeader signedIn={Boolean(session)} />
      <main className="mx-auto max-w-3xl px-6 py-16 animate-rise prose-none">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--pm-blue)]">
          Documentation
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-[var(--pm-ink)]">
          Evaluator notes
        </h1>
        <p className="mt-4 leading-relaxed text-[var(--pm-muted)]">
          Short architecture and compliance framing for supervisors and
          reviewers. This is a software prototype, not a medical device claim.
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-2xl font-semibold text-[var(--pm-ink)]">
            Architecture
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--pm-muted)]">
            <li>
              Next.js App Router + Prisma/PostgreSQL (Neon) + Vercel deployment
            </li>
            <li>
              Device HTTPS ingest at{" "}
              <code className="text-[var(--pm-ink)]">POST /api/readings</code>{" "}
              with per-device API key (identity never trusted from payload bed/patient IDs)
            </li>
            <li>
              SMS fallback stub at{" "}
              <code className="text-[var(--pm-ink)]">POST /api/ingest/sms</code>{" "}
              into the same ingest pipeline (no live SMS gateway wired yet)
            </li>
            <li>Dashboard updates via polling (3–5s), not WebSockets</li>
            <li>
              Hybrid alerting: NEWS2-inspired triage badges + admin/per-patient
              vital thresholds + DEVICE_OFFLINE
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-2xl font-semibold text-[var(--pm-ink)]">
            Roles
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--pm-muted)]">
            <li>Admin — full CRUD, thresholds, staff, devices, SIEM</li>
            <li>Doctor — view all wards; no staff/threshold CRUD</li>
            <li>Nurse — own ward read/write; lands on Beds after login</li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-2xl font-semibold text-[var(--pm-ink)]">
            Zambia Data Protection Act (framing)
          </h2>
          <p className="text-sm leading-relaxed text-[var(--pm-muted)]">
            Patient vitals are sensitive personal data. This prototype aims at
            least-privilege RBAC, append-only audit/SIEM logging, HTTPS in
            transit on Vercel, and Neon-managed disk encryption at rest. It does
            not claim full regulatory certification or field-level encryption of
            every column.
          </p>
        </section>

        <p className="mt-10 text-sm">
          <Link
            href="/about"
            className="font-semibold text-[var(--pm-blue)] hover:underline"
          >
            ← About
          </Link>
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
