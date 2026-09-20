"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyOnceBlock } from "@/components/copy-once-block";
import { KeyRound, Trash2, UserPlus } from "lucide-react";

type StaffUser = {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
  staffId: string | null;
  nrcOrPassport: string | null;
  ward: { id: string; name: string } | null;
};

type WardOption = { id: string; name: string };

type RoleFilter = "all" | "nurse" | "doctor" | "admin";

export function StaffManager({
  users,
  wards,
}: {
  users: StaffUser[];
  wards: WardOption[];
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [nrcOrPassport, setNrcOrPassport] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"nurse" | "doctor">("nurse");
  const [wardId, setWardId] = useState(wards[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempFor, setTempFor] = useState<string | null>(null);
  const [createdStaffId, setCreatedStaffId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RoleFilter>("all");

  useEffect(() => {
    if (!wardId && wards[0]) setWardId(wards[0].id);
  }, [wardId, wards]);

  const counts = useMemo(
    () => ({
      all: users.length,
      nurse: users.filter((u) => u.role === "nurse").length,
      doctor: users.filter((u) => u.role === "doctor").length,
      admin: users.filter((u) => u.role === "admin").length,
    }),
    [users],
  );

  const visible = users.filter((u) => filter === "all" || u.role === filter);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        nrcOrPassport,
        email,
        phone: phone || null,
        role,
        wardId: role === "nurse" ? wardId : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Could not create account");
      return;
    }
    const created = data as {
      temporaryPassword: string;
      user: StaffUser;
    };
    setTempPassword(created.temporaryPassword);
    setTempFor(created.user.email);
    setCreatedStaffId(created.user.staffId);
    setFullName("");
    setNrcOrPassport("");
    setEmail("");
    setPhone("");
    router.refresh();
  }

  async function resetPassword(id: string, userEmail: string) {
    if (!confirm(`Issue a new temporary password for ${userEmail}?`)) return;
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert((data as { error?: string }).error || "Reset failed");
      return;
    }
    setTempPassword((data as { temporaryPassword: string }).temporaryPassword);
    setTempFor(userEmail);
    setCreatedStaffId(null);
    router.refresh();
  }

  async function removeUser(id: string, userEmail: string) {
    if (!confirm(`Delete account ${userEmail}? They will lose access immediately.`)) {
      return;
    }
    const res = await fetch(`/api/staff/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert((data as { error?: string }).error || "Delete failed");
      return;
    }
    if (tempFor === userEmail) {
      setTempPassword(null);
      setTempFor(null);
      setCreatedStaffId(null);
    }
    router.refresh();
  }

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Accounts
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Admin-only. Create nurse and doctor logins here — there is no
          self-registration. A strong temporary password and staff ID are
          generated automatically; they must change the password under Settings
          after first sign-in.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Nurses" value={counts.nurse} />
        <Stat label="Doctors" value={counts.doctor} />
        <Stat label="Admins" value={counts.admin} />
      </div>

      {tempPassword && (
        <div className="space-y-2">
          {createdStaffId && (
            <p className="rounded-lg border border-line bg-surface px-4 py-2 text-sm text-ink">
              Staff ID:{" "}
              <span className="font-mono font-semibold">{createdStaffId}</span>
            </p>
          )}
          <CopyOnceBlock
            value={tempPassword}
            warning={
              tempFor
                ? `Temporary password for ${tempFor} — copy it now. They must change it after login.`
                : "Share this temporary password now — it will not be shown again."
            }
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-start">
        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus size={18} className="text-brand-deep" />
            <h2 className="font-semibold text-ink">Create account</h2>
          </div>
          <form onSubmit={createStaff} className="space-y-4">
            <div>
              <label htmlFor="staff-name" className="mb-1.5 block text-sm font-medium">
                Full name
              </label>
              <input
                id="staff-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={120}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label htmlFor="staff-nrc" className="mb-1.5 block text-sm font-medium">
                NRC / Passport
              </label>
              <input
                id="staff-nrc"
                value={nrcOrPassport}
                onChange={(e) => setNrcOrPassport(e.target.value)}
                required
                maxLength={60}
                placeholder="NRC or passport number"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label htmlFor="staff-email" className="mb-1.5 block text-sm font-medium">
                Hospital email
              </label>
              <input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                placeholder="nurse.name@hospital.test"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label htmlFor="staff-phone" className="mb-1.5 block text-sm font-medium">
                Phone (optional)
              </label>
              <input
                id="staff-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label htmlFor="staff-role" className="mb-1.5 block text-sm font-medium">
                Role
              </label>
              <select
                id="staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "nurse" | "doctor")}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
              >
                <option value="nurse">Nurse — own ward only</option>
                <option value="doctor">Doctor — all wards</option>
              </select>
            </div>
            {role === "nurse" && (
              <div>
                <label htmlFor="staff-ward" className="mb-1.5 block text-sm font-medium">
                  Ward
                </label>
                {wards.length === 0 ? (
                  <p className="text-sm text-warn">
                    Create a ward from the dashboard before adding a nurse.
                  </p>
                ) : (
                  <select
                    id="staff-ward"
                    value={wardId}
                    onChange={(e) => setWardId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
                  >
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <p className="text-xs text-ink-muted">
              Staff ID and a strong temporary password are generated
              automatically.
            </p>
            {error && <p className="text-sm text-alert">{error}</p>}
            <button
              type="submit"
              disabled={busy || (role === "nurse" && !wardId)}
              className="w-full rounded-lg bg-brand-deep px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h2 className="font-semibold text-ink">All accounts</h2>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["all", "All"],
                  ["nurse", "Nurses"],
                  ["doctor", "Doctors"],
                  ["admin", "Admins"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    filter === id
                      ? "bg-brand-deep text-white"
                      : "bg-bg text-ink-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-bg/60 text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name / ID</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Ward</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                      No accounts in this filter.
                    </td>
                  </tr>
                )}
                {visible.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-line/70 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">
                        {u.displayName || "—"}
                      </p>
                      <p className="font-mono text-xs text-ink-muted">
                        {u.staffId || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {u.ward?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {u.role !== "admin" && (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => resetPassword(u.id, u.email)}
                            className="rounded p-1.5 text-ink-muted hover:bg-brand-soft hover:text-brand-deep"
                            aria-label={`Reset password for ${u.email}`}
                            title="Issue new temporary password"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeUser(u.id, u.email)}
                            className="rounded p-1.5 text-ink-muted hover:bg-alert-soft hover:text-alert"
                            aria-label={`Delete ${u.email}`}
                            title="Delete account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">
        {value}
      </p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles =
    role === "admin"
      ? "bg-brand-soft text-brand-deep"
      : role === "doctor"
        ? "bg-ok-soft text-ok"
        : "bg-bg text-ink-muted";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles}`}
    >
      {role}
    </span>
  );
}
