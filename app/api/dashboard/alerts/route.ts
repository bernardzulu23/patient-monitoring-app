import { getAlertsFeed } from "@/lib/data";
import { syncDeviceOfflineAlert } from "@/lib/ingestReading";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = new URL(req.url).searchParams.get("status") ?? "ACTIVE";

  try {
    const devices = await prisma.device.findMany({
      select: { id: true },
      take: 200,
    });
    await Promise.all(devices.map((d) => syncDeviceOfflineAlert(d.id)));

    const alerts = await getAlertsFeed(session, { status });
    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }
}
