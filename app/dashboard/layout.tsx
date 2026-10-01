import { DashboardHeader } from "@/components/dashboard-header";
import { ForcePasswordGate } from "@/components/force-password-gate";
import { IdleLogout } from "@/components/idle-logout";
import { OfflineBanner } from "@/components/offline-banner";
import { requirePendingSession } from "@/lib/data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePendingSession();

  return (
    <div className="min-h-screen atmosphere">
      <IdleLogout />
      <ForcePasswordGate forced={session.mustChangePassword} />
      <div className="pointer-events-none fixed inset-0 atmosphere-grid opacity-50" />
      <div className="relative">
        <DashboardHeader session={session} />
        <OfflineBanner userId={session.userId} />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
