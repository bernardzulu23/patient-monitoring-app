import { notFound } from "next/navigation";
import { RoomPatientsManager } from "@/components/room-patients-manager";
import { canManagePatientsInWard } from "@/lib/authz";
import {
  getRoomDetail,
  getWardWithRooms,
  requireSession,
  suggestNextPatientCode,
} from "@/lib/data";
import { aggregateScore } from "@/lib/vitalScore";

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
    const reading = device?.readings[0];
    const score = reading
      ? aggregateScore(reading)
      : { total: 0, level: "NORMAL" as const };

    return {
      id: patient.id,
      fullName: patient.fullName,
      patientCode: patient.patientCode,
      scoreLevel: score.level,
      scoreTotal: score.total,
      heartRate: reading?.heartRate ?? null,
      spo2: reading?.spo2 ?? null,
      tempC: reading?.tempC ?? null,
      systolic: reading?.systolic ?? null,
      diastolic: reading?.diastolic ?? null,
      hasDevice: Boolean(device),
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
