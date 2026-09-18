import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { getSession } from "@/lib/session";

export default async function ContactPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-bg">
      <PublicHeader signedIn={Boolean(session)} />
      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
        <div className="animate-rise">
          <p className="text-sm font-medium uppercase tracking-wide text-brand">
            Contact
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
            Get in touch
          </h1>
          <p className="mt-4 text-ink-muted leading-relaxed">
            For evaluators, supervisors, or institutions interested in the
            prototype. Messages are stored for the project admin — this is not a
            clinical support line.
          </p>
          <div className="mt-8 space-y-3 text-sm text-ink-muted">
            <p>
              <span className="font-medium text-ink">Location</span>
              <br />
              Lusaka, Zambia
            </p>
            <p>
              <span className="font-medium text-ink">Project docs</span>
              <br />
              <Link href="/docs" className="text-brand hover:underline">
                Architecture and data-protection notes for reviewers
              </Link>
            </p>
          </div>
        </div>
        <div className="animate-rise rounded-xl border border-line bg-surface p-6">
          <ContactForm />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
