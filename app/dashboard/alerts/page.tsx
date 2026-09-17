import { AlertsLive } from "@/components/alerts-live";
import { isAdmin, isDoctor } from "@/lib/authz";
import { getAlertsFeed, requireSession } from "@/lib/data";
import { syncDeviceOfflineAlert } from "@/lib/ingestReading";
import { prisma } from "@/lib/prisma";

export default async function AlertsPage() {
  const session = await requireSession();

  // Refresh offline alerts for devices in scope before rendering
  const devices = await prisma.device.findMany({
    select: { id: true },
    take: 200,
  });
  await Promise.all(devices.map((d) => syncDeviceOfflineAlert(d.id)));

  const alerts = await getAlertsFeed(session, { status: "ACTIVE" });
  const canAcknowledge =
    isAdmin(session) ||
    isDoctor(session) ||
    (session.role === "nurse" && Boolean(session.wardId));

  return (
    <div className="animate-rise">
      <AlertsLive initial={alerts} canAcknowledge={canAcknowledge} />
    </div>
  );
}
