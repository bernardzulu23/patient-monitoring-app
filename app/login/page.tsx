import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ idle?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const { idle } = await searchParams;

  return (
    <div className="relative min-h-screen atmosphere overflow-hidden">
      <div className="pointer-events-none absolute inset-0 atmosphere-grid opacity-70" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 lg:flex-row lg:items-center lg:gap-20">
        <div className="mb-12 max-w-xl lg:mb-0 animate-rise">
          <p className="font-display text-4xl font-semibold tracking-tight text-brand-deep sm:text-5xl">
            Patient Monitor
          </p>
          <p className="mt-4 text-lg text-ink-muted leading-relaxed">
            Live vital signs across hospital wards — heart rate, SpO₂,
            temperature, and blood pressure at a glance.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-ink-muted">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-ok animate-pulse-soft" />
            Polling every few seconds · nurse and admin access
          </div>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-line/80 bg-surface/90 p-8 shadow-[0_20px_50px_-28px_rgba(8,78,75,0.45)] backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-ink">Sign in</h1>
          <p className="mt-1 mb-6 text-sm text-ink-muted">
            Use your hospital email and password.
            {idle === "1"
              ? " Your session ended after inactivity."
              : " Password resets are issued by an admin (no email reset)."}
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
