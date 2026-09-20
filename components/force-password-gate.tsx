"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Redirects away from dashboard pages until a temporary password is changed. */
export function ForcePasswordGate({ forced }: { forced: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!forced) return;
    if (pathname.startsWith("/dashboard/settings")) return;
    router.replace("/dashboard/settings?force=1");
  }, [forced, pathname, router]);

  if (!forced) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-warn bg-warn-soft px-4 py-3 text-center text-sm text-warn">
      You must change your temporary password before continuing.{" "}
      <a href="/dashboard/settings?force=1" className="font-semibold underline">
        Open Settings
      </a>
    </div>
  );
}
