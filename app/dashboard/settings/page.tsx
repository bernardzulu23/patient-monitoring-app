import { ChangePasswordForm } from "@/components/change-password-form";
import { requireSession } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ force?: string }>;
}) {
  const session = await requireSession();
  const { force } = await searchParams;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { mustChangePassword: true },
  });
  const forced = Boolean(user?.mustChangePassword) || force === "1";

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {forced
            ? "Your account was issued a temporary password. Choose a new password to continue using the dashboard."
            : "Change the password you use to sign in. After an admin gives you a temporary password, update it here."}
        </p>
      </div>
      {forced && (
        <div className="rounded-lg border border-warn bg-warn-soft px-4 py-3 text-sm text-warn">
          Password change required before you can open other dashboard pages.
        </div>
      )}
      <ChangePasswordForm />
    </div>
  );
}
