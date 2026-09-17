import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/authz";
import { requireSession } from "@/lib/data";

/** Legacy audit URL → SIEM dashboard. */
export default async function AuditPage() {
  const session = await requireSession();
  if (!isAdmin(session)) redirect("/dashboard");
  redirect("/dashboard/siem");
}
