import { DashboardHeader } from "@/components/dashboard-header";
import { requireSession } from "@/lib/data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="min-h-screen atmosphere">
      <div className="pointer-events-none fixed inset-0 atmosphere-grid opacity-50" />
      <div className="relative">
        <DashboardHeader session={session} />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
