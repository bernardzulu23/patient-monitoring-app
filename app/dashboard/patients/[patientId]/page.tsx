import { notFound } from "next/navigation";
import { PatientDetailLive } from "@/components/patient-detail-live";
import { canManagePatientsInWard } from "@/lib/authz";
import {
  getPatientDetail,
  requireSession,
  serializePatientDetail,
} from "@/lib/data";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const session = await requireSession();
  const patient = await getPatientDetail(session, patientId);
  if (!patient) notFound();

  const initial = {
    ...serializePatientDetail(patient),
    canSimulate: canManagePatientsInWard(session, patient.room.wardId),
  };

  return <PatientDetailLive patientId={patientId} initial={initial} />;
}
