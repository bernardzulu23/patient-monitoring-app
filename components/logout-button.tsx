"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/logout", { method: "POST" });
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
