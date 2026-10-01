"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOutAndClear } from "@/lib/offline-session";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await signOutAndClear();
    } catch {
      // offline: caches are still cleared; server session expires on its own
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted transition hover:border-brand hover:text-brand disabled:opacity-60"
    >
      {loading ? "…" : "Sign out"}
    </button>
  );
}
