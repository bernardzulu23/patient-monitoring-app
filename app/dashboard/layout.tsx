import { DashboardHeader } from "@/components/dashboard-header";
import { ForcePasswordGate } from "@/components/force-password-gate";
import { IdleLogout } from "@/components/idle-logout";
import { requireSession } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { mustChangePassword: true },
  });

  return (
    <div className="min-h-screen atmosphere">
      <IdleLogout />
      <ForcePasswordGate forced={Boolean(user?.mustChangePassword)} />
      <div className="pointer-events-none fixed inset-0 atmosphere-grid opacity-50" />
      <div className="relative">
        <DashboardHeader session={session} />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
