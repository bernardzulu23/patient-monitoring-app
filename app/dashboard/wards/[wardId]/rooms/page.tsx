import { notFound } from "next/navigation";
import { RoomsManager } from "@/components/rooms-manager";
import { isAdmin } from "@/lib/authz";
import { getWardWithRooms, requireSession } from "@/lib/data";

export default async function WardRoomsPage({
  params,
}: {
  params: Promise<{ wardId: string }>;
}) {
  const { wardId } = await params;
  const session = await requireSession();
  const ward = await getWardWithRooms(session, wardId);
  if (!ward) notFound();

  return (
    <RoomsManager
      wardId={ward.id}
      wardName={ward.name}
      isAdmin={isAdmin(session)}
      rooms={ward.rooms.map((r) => ({
        id: r.id,
        number: r.number,
        patientCount: r._count.patients,
      }))}
    />
  );
}
