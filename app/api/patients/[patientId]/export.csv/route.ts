import { NextResponse } from "next/server";
import { canAccessWard, isAdmin, isDoctor } from "@/lib/authz";
import { getPatientDetail } from "@/lib/data";
import { logAction } from "@/lib/audit";
import { getSession } from "@/lib/session";

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

  if (
    !isAdmin(session) &&
    !isDoctor(session) &&
    !(session.role === "nurse" && canAccessWard(session, patient.room.wardId))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const device = patient.devices[0];
  const readings = device?.readings ?? [];
  const alerts = device?.alerts ?? [];

  const lines: string[] = [];
  lines.push("section,id,field1,field2,field3,field4,field5,field6");
  lines.push(
    [
      "patient",
      patient.id,
      csv(patient.fullName),
      csv(patient.patientCode),
      csv(patient.status),
      csv(String(patient.age ?? "")),
      csv(patient.sex ?? ""),
      csv(patient.admissionReason ?? ""),
    ].join(","),
  );

  for (const r of readings) {
    lines.push(
      [
        "reading",
        r.id,
        r.recordedAt.toISOString(),
        r.heartRate ?? "",
        r.spo2 ?? "",
        r.tempC ?? "",
        r.systolic ?? "",
        r.diastolic ?? "",
      ].join(","),
    );
  }
  for (const a of alerts) {
    lines.push(
      [
        "alert",
        a.id,
        a.createdAt.toISOString(),
        csv(a.alertType),
        csv(a.status),
        a.value ?? "",
        "",
        "",
      ].join(","),
    );
  }

  await logAction(session.userId, "EXPORTED_PATIENT_CSV", "Patient", patientId);

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${patient.patientCode}-export.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
