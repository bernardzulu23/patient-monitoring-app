import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ idle?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const { idle } = await searchParams;

  return (
    <div className="public-marketing relative flex min-h-screen flex-col">
      <PublicHeader signedIn={false} />

      <div className="relative flex flex-1 overflow-hidden bg-[var(--pm-blue-soft)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(rgba(6,74,122,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(6,74,122,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16 lg:flex-row lg:items-center lg:gap-20">
          <div className="mb-12 max-w-xl animate-rise lg:mb-0">
            <p className="font-display text-4xl font-semibold tracking-tight text-[var(--pm-blue-deep)] sm:text-5xl">
              Patient Monitoring System
            </p>
            <p className="mt-4 text-lg leading-relaxed text-[var(--pm-muted)]">
              Live vital signs across hospital wards — heart rate, SpO₂,
              temperature, and blood pressure at a glance.
            </p>
            <div className="mt-8 flex items-center gap-3 text-sm text-[var(--pm-muted)]">
              <span className="inline-flex h-2.5 w-2.5 animate-pulse-soft rounded-full bg-[var(--pm-blue)]" />
              Polling every few seconds · nurse and admin access
            </div>
          </div>

          <div className="w-full max-w-md border border-[var(--pm-line)] bg-white/95 p-8 shadow-[0_20px_50px_-28px_rgba(6,74,122,0.35)] backdrop-blur-sm">
            <h1 className="text-lg font-semibold text-[var(--pm-ink)]">Sign in</h1>
            <p className="mb-6 mt-1 text-sm text-[var(--pm-muted)]">
              Use your hospital email and password.
              {idle === "1"
                ? " Your session ended after inactivity."
                : " Password resets are issued by an admin (no email reset)."}
            </p>
            <LoginForm />
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
