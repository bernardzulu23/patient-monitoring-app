"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOutAndClear } from "@/lib/offline-session";

const IDLE_MS = 20 * 60 * 1000; // 20 minutes

/** Auto-logout after inactivity (patient data sensitivity). */
export function IdleLogout() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        try {
          await signOutAndClear();
        } catch {
          // ignore
        }
        router.push("/login?idle=1");
        router.refresh();
      }, IDLE_MS);
    }

    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;
    for (const ev of events) {
      window.addEventListener(ev, reset, { passive: true });
    }
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      for (const ev of events) {
        window.removeEventListener(ev, reset);
      }
    };
  }, [router]);

  return null;
}
