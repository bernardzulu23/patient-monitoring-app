import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { severityForAction } from "@/lib/siem";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const severity = searchParams.get("severity");
  const action = searchParams.get("action")?.trim() || null;
  const take = Math.min(Number(searchParams.get("take") || 150) || 150, 300);

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [recent, counts24h, failed24h, privileged24h, ingest24h] =
    await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 400,
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

  let events = recent.map((log) => ({
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    createdAt: log.createdAt.toISOString(),
    userEmail: log.user?.email ?? null,
    userRole: log.user?.role ?? null,
    severity: severityForAction(log.action),
  }));

  if (severity && severity !== "all") {
    events = events.filter((e) => e.severity === severity);
  }
  if (action) {
    const q = action.toUpperCase();
    events = events.filter((e) => e.action.includes(q));
  }

  events = events.slice(0, take);

  const severityBreakdown = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const e of recent.slice(0, 400)) {
    severityBreakdown[severityForAction(e.action)] += 1;
  }

  return NextResponse.json({
    totals: {
      events24h: counts24h,
      failedLogins24h: failed24h,
      privileged24h,
      ingest24h,
    },
    severityBreakdown,
    events,
    fetchedAt: new Date().toISOString(),
  });
}
