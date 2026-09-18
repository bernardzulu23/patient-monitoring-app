import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/authz";
import { requireSession } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export default async function AdminMessagesPage() {
  const session = await requireSession();
  if (!isAdmin(session)) redirect("/dashboard");

  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Mark unread as read on view
  const unreadIds = messages.filter((m) => !m.readAt).map((m) => m.id);
  if (unreadIds.length > 0) {
    await prisma.contactMessage.updateMany({
      where: { id: { in: unreadIds } },
      data: { readAt: new Date() },
    });
  }

  return (
    <div className="animate-rise space-y-6">
      <div>
        <Link href="/dashboard/admin" className="text-sm text-brand hover:underline">
          ← Admin
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          Contact messages
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Submissions from the public contact form
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bg/60 text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">From</th>
              <th className="px-4 py-3 font-medium">Institution</th>
              <th className="px-4 py-3 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-muted">
                  No messages yet.
                </td>
              </tr>
            ) : (
              messages.map((m) => (
                <tr key={m.id} className="border-b border-line/70 last:border-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-muted">
                    {m.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{m.institution}</td>
                  <td className="px-4 py-3 whitespace-pre-wrap text-ink">
                    {m.message}
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
