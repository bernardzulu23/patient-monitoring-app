import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import type { SessionPayload } from "@/lib/session";

export function DashboardHeader({
  session,
  subtitle,
}: {
  session: SessionPayload;
  subtitle?: string;
}) {
  return (
    <header className="border-b border-line/80 bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <Link
            href="/dashboard"
            className="font-display text-xl font-semibold text-brand-deep"
          >
            Patient Monitor
          </Link>
          {subtitle && (
            <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <p className="font-medium text-ink capitalize">{session.role}</p>
            <p className="text-ink-muted text-xs">Signed in</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
