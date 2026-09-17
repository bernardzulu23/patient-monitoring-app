import Link from "next/link";
import { redirect } from "next/navigation";
import { DevicesAdminManager } from "@/components/devices-admin-manager";
import { isAdmin } from "@/lib/authz";
import { requireSession } from "@/lib/data";

export default async function DevicesAdminPage() {
  const session = await requireSession();
  if (!isAdmin(session)) redirect("/dashboard");

  return (
    <div className="animate-rise space-y-6">
      <div>
        <Link href="/dashboard/admin" className="text-sm text-brand hover:underline">
          ← Admin
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          Device ↔ bed mapping
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Register ESP32 monitors to beds. Ingest resolves identity from API key
          only.
        </p>
      </div>
      <DevicesAdminManager />
    </div>
  );
}
