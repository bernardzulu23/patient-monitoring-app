import { redirect } from "next/navigation";
import { AdmitPatientForm } from "@/components/admit-patient-form";
import { canAdmitPatients } from "@/lib/authz";
import {
  getAdmitBeds,
  requireSession,
  suggestNextPatientCode,
} from "@/lib/data";

export default async function AdmitPage() {
  const session = await requireSession();
  if (!canAdmitPatients(session)) {
    redirect("/dashboard");
  }

  const [beds, suggestedCode] = await Promise.all([
    getAdmitBeds(session),
    suggestNextPatientCode(),
  ]);

  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Register patient
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Admit a patient to an empty bed in your ward. Full name, date of birth,
          residential address, next of kin, and reason for admission are required.
        </p>
      </div>
      <AdmitPatientForm beds={beds} suggestedCode={suggestedCode} />
    </div>
  );
}
