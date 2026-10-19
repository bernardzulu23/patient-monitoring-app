"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PasskeyRow = {
  id: string;
  name: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
};

export function PasskeyManager({ disabled }: { disabled: boolean }) {
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/passkeys", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as { passkeys?: PasskeyRow[] };
      setPasskeys(data.passkeys ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        typeof window.PublicKeyCredential !== "undefined",
    );
    void load();
  }, [load]);

  async function handleAdd() {
    setError("");
    setBusy(true);
    try {
      const optRes = await fetch("/api/passkeys/register/options", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const optData = await optRes.json().catch(() => ({}));
      if (!optRes.ok) {
        setError(
          (optData as { error?: string }).error ||
            "Could not start passkey registration",
        );
        return;
      }

      const attestation = await startRegistration({ optionsJSON: optData });
      const regRes = await fetch("/api/passkeys/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attestation,
          name: name.trim() || undefined,
        }),
      });
      const regData = await regRes.json().catch(() => ({}));
      if (!regRes.ok) {
        setError(
          (regData as { error?: string }).error || "Could not save passkey",
        );
        return;
      }
      setName("");
      await load();
    } catch (err) {
      const message =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Passkey registration was cancelled"
          : "Could not register passkey on this device";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/passkeys/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || "Could not remove passkey");
        return;
      }
      setPasskeys((list) => list.filter((p) => p.id !== id));
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-md space-y-4 rounded-xl border border-line bg-surface p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand/10 p-2 text-brand-deep">
          <KeyRound size={20} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">Passkeys</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Optional fingerprint, Face ID, or device PIN sign-in. Password always
            remains as a fallback.
          </p>
        </div>
      </div>

      {disabled && (
        <p className="rounded-md border border-warn bg-warn-soft px-3 py-2 text-sm text-warn">
          Change your temporary password before adding a passkey.
        </p>
      )}

      {!supported && !loading && (
        <p className="text-sm text-ink-muted">
          This browser does not support passkeys. Use email and password instead.
        </p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </p>
      ) : passkeys.length === 0 ? (
        <p className="text-sm text-ink-muted">No passkeys registered yet.</p>
      ) : (
        <ul className="space-y-2">
          {passkeys.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {p.name || "Passkey"}
                </p>
                <p className="text-xs text-ink-muted">
                  Added {new Date(p.createdAt).toLocaleDateString()}
                  {p.backedUp ? " · synced" : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy || disabled}
                onClick={() => void handleRemove(p.id)}
                className="rounded-md p-2 text-ink-muted hover:bg-alert-soft hover:text-alert disabled:opacity-50"
                aria-label={`Remove ${p.name || "passkey"}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {supported && (
        <div className="space-y-3 border-t border-line pt-4">
          <div>
            <label
              htmlFor="passkeyName"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Name (optional)
            </label>
            <input
              id="passkeyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy || disabled}
              maxLength={80}
              placeholder="e.g. Ward tablet"
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
            />
          </div>
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => void handleAdd()}
            className="rounded-lg bg-brand-deep px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60"
          >
            {busy ? "Working…" : "Add passkey"}
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-alert-soft px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}
    </section>
  );
}
