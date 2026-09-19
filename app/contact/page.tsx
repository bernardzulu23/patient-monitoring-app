import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { LusakaMap } from "@/components/lusaka-map";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { getSession } from "@/lib/session";

export default async function ContactPage() {
  const session = await getSession();

  return (
    <div className="public-marketing min-h-screen">
      <PublicHeader signedIn={Boolean(session)} />
      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
        <div className="animate-rise">
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--pm-blue)]">
            Contact
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-[var(--pm-ink)]">
            Get in touch
          </h1>
          <p className="mt-4 leading-relaxed text-[var(--pm-muted)]">
            For evaluators, supervisors, or institutions interested in the
            prototype. Messages are stored for the project admin — this is not a
            clinical support line.
          </p>
          <div className="mt-8 space-y-3 text-sm text-[var(--pm-muted)]">
            <p>
              <span className="font-medium text-[var(--pm-ink)]">Location</span>
              <br />
              Lusaka, Zambia
            </p>
            <p>
              <span className="font-medium text-[var(--pm-ink)]">Project docs</span>
              <br />
              <Link
                href="/docs"
                className="text-[var(--pm-blue)] hover:underline"
              >
                Architecture and data-protection notes for reviewers
              </Link>
            </p>
          </div>
        </div>
        <div className="animate-rise border border-[var(--pm-line)] bg-white p-6 shadow-sm">
          <ContactForm />
        </div>
      </main>

      <section className="border-t border-[var(--pm-line)] bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <LusakaMap title="Find us — Lusaka" />
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
