import { WardOverviewLive } from "@/components/ward-overview-live";
import { getWardOverview, requireSession } from "@/lib/data";

export default async function DashboardPage() {
  const session = await requireSession();

  let wards: Awaited<ReturnType<typeof getWardOverview>> = [];
  let dbError = false;

  try {
    wards = await getWardOverview(session);
  } catch {
    dbError = true;
  }

  return (
    <div>
      {dbError && (
        <div className="mb-6 rounded-lg border border-warn bg-warn-soft px-4 py-3 text-sm text-warn">
          Database unavailable. Set Neon <code className="font-mono">DATABASE_URL</code>{" "}
          and <code className="font-mono">DATABASE_URL_UNPOOLED</code> in{" "}
          <code className="font-mono">.env</code>, then run{" "}
          <code className="font-mono">npx prisma migrate deploy</code> and{" "}
          <code className="font-mono">npx prisma db seed</code>.
        </div>
      )}
      <WardOverviewLive initial={wards} />
    </div>
  );
}
