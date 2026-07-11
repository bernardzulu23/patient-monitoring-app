"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyOnceBlock } from "@/components/copy-once-block";
import { Modal } from "@/components/modal";
import { Trash2 } from "lucide-react";

type StaffUser = {
  id: string;
  email: string;
  role: string;
  ward: { id: string; name: string } | null;
};

type WardOption = { id: string; name: string };

export function StaffManager({
  users,
  wards,
}: {
  users: StaffUser[];
  wards: WardOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"nurse" | "doctor">("nurse");
  const [wardId, setWardId] = useState(wards[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        role,
        wardId: role === "nurse" ? wardId : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Create failed");
      return;
    }
    setTempPassword((data as { temporaryPassword: string }).temporaryPassword);
    setOpen(false);
    setEmail("");
    router.refresh();
  }

  async function removeUser(id: string, userEmail: string) {
    if (!confirm(`Delete account ${userEmail}?`)) return;
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert((data as { error?: string }).error || "Delete failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Staff
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Admin creates all accounts — no self-registration. Password changes
            are admin-only for this project.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError("");
            setTempPassword(null);
          }}
          className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white hover:bg-brand"
        >
          New Staff
        </button>
      </div>

      {tempPassword && (
        <CopyOnceBlock
          value={tempPassword}
          warning="Share this temporary password with the staff member now — it will not be shown again."
        />
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bg/60 text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Ward</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-line/70 last:border-0"
              >
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {u.ward?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role !== "admin" && (
                    <button
                      type="button"
                      onClick={() => removeUser(u.id, u.email)}
                      className="rounded p-1.5 text-ink-muted hover:bg-alert-soft hover:text-alert"
                      aria-label={`Delete ${u.email}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal title="New staff" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={createStaff} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Role</label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "nurse" | "doctor")
              }
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
            >
              <option value="nurse">Nurse</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>
          {role === "nurse" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Ward</label>
              <select
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
            </div>
          )}
          {error && <p className="text-sm text-alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || (role === "nurse" && !wardId)}
              className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
