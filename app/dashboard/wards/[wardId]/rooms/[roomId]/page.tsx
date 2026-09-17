import { notFound } from "next/navigation";
import { RoomPatientsManager } from "@/components/room-patients-manager";
import { canManagePatientsInWard } from "@/lib/authz";
import {
  formatRelativeAge,
  resolveMonitorStatus,
} from "@/lib/ingestReading";
import {
  getRoomDetail,
  getWardWithRooms,
  requireSession,
  suggestNextPatientCode,
} from "@/lib/data";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ wardId: string; roomId: string }>;
}) {
  const { wardId, roomId } = await params;
  const session = await requireSession();
  const room = await getRoomDetail(session, wardId, roomId);
  if (!room) notFound();

  const ward = await getWardWithRooms(session, wardId);
  const suggestedCode = await suggestNextPatientCode();

  const patients = room.patients.map((patient) => {
    const device = patient.devices[0];
    const reading = device?.readings[0] ?? null;
    const resolved = resolveMonitorStatus({
      hasDevice: Boolean(device),
      lastSeen: device?.lastSeen,
      reading,
    });

    return {
      id: patient.id,
      fullName: patient.fullName,
      patientCode: patient.patientCode,
      status: resolved.status,
      scoreTotal: resolved.scoreTotal,
      heartRate: reading?.heartRate ?? null,
      spo2: reading?.spo2 ?? null,
      tempC: reading?.tempC ?? null,
      systolic: reading?.systolic ?? null,
      diastolic: reading?.diastolic ?? null,
      hasDevice: Boolean(device),
      lastReadingAge: formatRelativeAge(reading?.recordedAt),
      lastSeenAge: formatRelativeAge(device?.lastSeen),
    };
  });

  return (
    <RoomPatientsManager
      wardId={wardId}
      wardName={room.ward.name}
      roomId={room.id}
      roomNumber={room.number}
      patients={patients}
      wardRooms={(ward?.rooms ?? []).map((r) => ({
        id: r.id,
        number: r.number,
      }))}
      canManage={canManagePatientsInWard(session, wardId)}
      suggestedCode={suggestedCode}
    />
  );
}
