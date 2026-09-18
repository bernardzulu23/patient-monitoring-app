import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { DEFAULT_THRESHOLDS, getHospitalThresholds } from "@/lib/thresholds";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const thresholds = await getHospitalThresholds();
  return NextResponse.json({ thresholds, defaults: DEFAULT_THRESHOLDS });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const num = (v: unknown, fallback: number) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const current = await getHospitalThresholds();
  const data = {
    tempLow: num(body.tempLow, current.tempLow),
    tempHigh: num(body.tempHigh, current.tempHigh),
    hrLow: num(body.hrLow, current.hrLow),
    hrHigh: num(body.hrHigh, current.hrHigh),
    spo2Low: num(body.spo2Low, current.spo2Low),
    sysLow: num(body.sysLow, current.sysLow),
    sysHigh: num(body.sysHigh, current.sysHigh),
    rrLow: num(body.rrLow, current.rrLow),
    rrHigh: num(body.rrHigh, current.rrHigh),
    updatedById: session.userId,
  };

  const row = await prisma.hospitalThresholds.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  await logAction(
    session.userId,
    "UPDATED_THRESHOLDS",
    "HospitalThresholds",
    "default",
  );

  return NextResponse.json({
    thresholds: {
      tempLow: row.tempLow,
      tempHigh: row.tempHigh,
      hrLow: row.hrLow,
      hrHigh: row.hrHigh,
      spo2Low: row.spo2Low,
      sysLow: row.sysLow,
      sysHigh: row.sysHigh,
      rrLow: row.rrLow,
      rrHigh: row.rrHigh,
    },
  });
}
