import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { isAdmin } from "@/lib/authz";
import type { SessionPayload } from "@/lib/session";

const linkClass = "text-ink-muted hover:text-brand";

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
            <Link href="/dashboard" className={linkClass}>
              Wards
            </Link>
            <Link href="/dashboard/beds" className={linkClass}>
              Beds
            </Link>
            <Link href="/dashboard/alerts" className={linkClass}>
              Alerts
            </Link>
            <Link
              href="/dashboard/directory?role=nurse"
              className={linkClass}
            >
              Nurses
            </Link>
            <Link
              href="/dashboard/directory?role=doctor"
              className={linkClass}
            >
              Doctors
            </Link>
            {isAdmin(session) && (
              <Link href="/dashboard/admin" className={linkClass}>
                Admin
              </Link>
            )}
            <Link href="/dashboard/settings" className={linkClass}>
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
