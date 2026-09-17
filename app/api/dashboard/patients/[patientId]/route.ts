import { NextResponse } from "next/server";
import { canManagePatientsInWard } from "@/lib/authz";
import {
  getPatientDetail,
  serializePatientDetail,
} from "@/lib/data";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientId } = await params;
  const patient = await getPatientDetail(session, patientId);
  if (!patient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canSimulate = canManagePatientsInWard(
    session,
    patient.room.wardId,
  );

  return NextResponse.json({
    ...serializePatientDetail(patient),
    canSimulate,
  });
}
