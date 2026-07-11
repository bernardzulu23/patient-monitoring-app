import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/authz";
import { requireSession } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export default async function AuditPage() {
  const session = await requireSession();
  if (!isAdmin(session)) redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { email: true } },
    },
  });

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Append-only record of clinical and admin mutations. Read-only — entries
          cannot be edited or deleted.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bg/60 text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  No audit events yet. Create a ward, patient, or staff account
                  to generate entries.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-line/70 last:border-0"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-ink-muted">
                    {log.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    {log.user?.email ?? "(removed account)"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">
                    {log.action}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-ink-muted">{log.targetType}</span>{" "}
                    <span className="font-mono text-xs text-ink">
                      {log.targetId.slice(0, 10)}…
                    </span>
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
