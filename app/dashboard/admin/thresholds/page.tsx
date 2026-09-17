import Link from "next/link";
import { redirect } from "next/navigation";
import { ThresholdsForm } from "@/components/thresholds-form";
import { isAdmin } from "@/lib/authz";
import { requireSession } from "@/lib/data";
import { getHospitalThresholds } from "@/lib/thresholds";

export default async function ThresholdsPage() {
  const session = await requireSession();
  if (!isAdmin(session)) redirect("/dashboard");
  const thresholds = await getHospitalThresholds();

  return (
    <div className="animate-rise space-y-6">
      <div>
        <Link href="/dashboard/admin" className="text-sm text-brand hover:underline">
          ← Admin
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          Vital thresholds
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Hospital defaults used for hybrid threshold alerts
        </p>
      </div>
      <ThresholdsForm initial={thresholds} />
    </div>
  );
}
