import { BedsLive } from "@/components/beds-live";
import { getBedsOverview, requireSession } from "@/lib/data";

export default async function BedsPage() {
  const session = await requireSession();
  const beds = await getBedsOverview(session);
  return (
    <div className="animate-rise">
      <BedsLive initial={beds} />
    </div>
  );
}
