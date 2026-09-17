import { redirect } from "next/navigation";
import { SiemDashboardLive } from "@/components/siem-dashboard-live";
import { isAdmin } from "@/lib/authz";
import { requireSession } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { severityForAction } from "@/lib/siem";

export default async function SiemPage() {
  const session = await requireSession();
  if (!isAdmin(session)) redirect("/dashboard");

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [recent, counts24h, failed24h, privileged24h, ingest24h] =
    await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 150,
        include: { user: { select: { email: true, role: true } } },
      }),
      prisma.auditLog.count({ where: { createdAt: { gte: since24h } } }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: since24h },
          action: { in: ["LOGIN_FAILED", "LOGIN_RATE_LIMITED"] },
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: since24h },
          action: {
            in: [
              "CREATED_STAFF",
              "DELETED_STAFF",
              "RESET_STAFF_PASSWORD",
              "DELETED_WARD",
              "DELETED_PATIENT",
            ],
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: since24h },
          action: "DEVICE_READING_INGESTED",
        },
      }),
    ]);

  const severityBreakdown = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  } as Record<"critical" | "high" | "medium" | "low" | "info", number>;

  const events = recent.map((log) => {
    const severity = severityForAction(log.action);
    severityBreakdown[severity] += 1;
    return {
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      createdAt: log.createdAt.toISOString(),
      userEmail: log.user?.email ?? null,
      userRole: log.user?.role ?? null,
      severity,
    };
  });

  return (
    <div className="animate-rise">
      <SiemDashboardLive
        initial={{
          totals: {
            events24h: counts24h,
            failedLogins24h: failed24h,
            privileged24h,
            ingest24h,
          },
          severityBreakdown,
          events,
          fetchedAt: new Date().toISOString(),
        }}
      />
    </div>
  );
}
