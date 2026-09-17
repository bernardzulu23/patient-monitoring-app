import { requireSession } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  await requireSession();
  const { role: roleParam } = await searchParams;
  const role = roleParam === "doctor" ? "doctor" : "nurse";

  const users = await prisma.user.findMany({
    where: { role },
    orderBy: [{ displayName: "asc" }, { email: "asc" }],
    include: { ward: { select: { id: true, name: true } } },
  });

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink capitalize">
          {role}s
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Staff directory · accounts are created by Admin
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bg/60 text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Staff ID</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Ward</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  No {role}s yet.{" "}
                  <Link href="/dashboard/admin" className="text-brand underline">
                    Admin
                  </Link>{" "}
                  can create accounts.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-line/70 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium">
                    {u.displayName || u.email.split("@")[0]}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted">
                    {u.staffId ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">{u.email}</td>
                  <td className="px-4 py-2.5 text-ink-muted">
                    {u.phone ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink-muted">
                    {u.ward?.name ?? (role === "doctor" ? "All wards" : "—")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
