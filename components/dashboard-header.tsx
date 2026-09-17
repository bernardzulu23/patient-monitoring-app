import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { canManageStaff, isAdmin } from "@/lib/authz";
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center gap-6">
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
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/dashboard" className="text-ink-muted hover:text-brand">
              Wards
            </Link>
            {canManageStaff(session) && (
              <Link
                href="/dashboard/staff"
                className="text-ink-muted hover:text-brand"
              >
                Accounts
              </Link>
            )}
            {isAdmin(session) && (
              <Link
                href="/dashboard/audit"
                className="text-ink-muted hover:text-brand"
              >
                Audit
              </Link>
            )}
            <Link
              href="/dashboard/settings"
              className="text-ink-muted hover:text-brand"
            >
              Settings
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <p className="font-medium text-ink capitalize">{session.role}</p>
            <p className="text-xs text-ink-muted">Signed in</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
