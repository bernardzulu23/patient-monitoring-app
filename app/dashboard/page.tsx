import { WardOverviewLive } from "@/components/ward-overview-live";
import { isAdmin } from "@/lib/authz";
import { getDashboardOverview, requireSession } from "@/lib/data";

export default async function DashboardPage() {
  const session = await requireSession();

  let overview: Awaited<ReturnType<typeof getDashboardOverview>> | null = null;
  let dbError = false;

  try {
    overview = await getDashboardOverview(session);
  } catch {
    dbError = true;
  }

  return (
    <div>
      {dbError && (
        <div className="mb-6 rounded-lg border border-warn bg-warn-soft px-4 py-3 text-sm text-warn">
          Database unavailable or migration pending. Run{" "}
          <code className="font-mono">npx prisma migrate deploy</code> and{" "}
          <code className="font-mono">npx prisma db seed</code>.
        </div>
      )}
      <WardOverviewLive
        initial={
          overview ?? {
            wards: [],
            attention: [],
            totals: {
              urgent: 0,
              low: 0,
              offline: 0,
              online: 0,
              openAlerts: 0,
              activePatients: 0,
              occupancyPercent: null,
            },
          }
        }
        isAdmin={isAdmin(session)}
      />
    </div>
  );
}
