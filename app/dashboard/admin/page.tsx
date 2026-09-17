import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/authz";
import { requireSession } from "@/lib/data";

const links = [
  {
    href: "/dashboard/admin/thresholds",
    title: "Vital thresholds",
    desc: "Hospital defaults for hybrid threshold alerts (not medical advice).",
  },
  {
    href: "/dashboard/staff",
    title: "Staff accounts",
    desc: "Create and manage nurse and doctor logins.",
  },
  {
    href: "/dashboard/admin/devices",
    title: "Device ↔ bed mapping",
    desc: "Register ESP32 units to beds (rooms).",
  },
  {
    href: "/dashboard/siem",
    title: "SIEM monitor",
    desc: "Security-oriented audit event stream.",
  },
  {
    href: "/dashboard/site",
    title: "Landing images",
    desc: "Upload hero and gallery photos for the public home page.",
  },
];

export default async function AdminHubPage() {
  const session = await requireSession();
  if (!isAdmin(session)) redirect("/dashboard");

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Admin</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Configuration and hospital-wide tools
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block rounded-xl border border-line bg-surface p-5 transition hover:border-brand"
            >
              <h2 className="font-semibold text-ink">{l.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">{l.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
