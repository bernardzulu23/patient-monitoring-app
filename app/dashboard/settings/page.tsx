import { ChangePasswordForm } from "@/components/change-password-form";
import { requireSession } from "@/lib/data";

export default async function SettingsPage() {
  await requireSession();

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Change the password you use to sign in. After an admin gives you a
          temporary password, update it here.
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
