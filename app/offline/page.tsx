import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline · Patient Monitor",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0f4c5c",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink">
        You are offline
      </h1>
      <p className="max-w-md text-sm text-ink-muted">
        This hospital tablet cannot reach the ward server right now. Cached
        screens may still work. Reconnect to hospital Wi‑Fi to sync.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-brand-deep px-4 py-2 text-sm font-semibold text-white"
      >
        Retry dashboard
      </Link>
    </main>
  );
}
