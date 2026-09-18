"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/docs", label: "Docs" },
];

export function PublicHeader({
  signedIn,
  light = false,
}: {
  signedIn: boolean;
  light?: boolean;
}) {
  const pathname = usePathname();
  const text = light ? "text-white/90 hover:text-white" : "text-ink-muted hover:text-brand";
  const brand = light ? "text-white" : "text-brand-deep";
  const active = light ? "text-white font-semibold" : "text-brand font-semibold";

  return (
    <header
      className={
        light
          ? "absolute left-0 right-0 top-0 z-20"
          : "border-b border-line/80 bg-surface/90 backdrop-blur-sm"
      }
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className={`font-display text-lg font-semibold tracking-tight ${brand}`}>
          Patient Monitor
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${text} ${pathname === l.href ? active : ""}`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={signedIn ? "/dashboard" : "/login"}
            className={
              light
                ? "rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-brand-deep"
                : "rounded-lg bg-brand-deep px-3 py-1.5 text-sm font-semibold text-white"
            }
          >
            {signedIn ? "Dashboard" : "Sign In"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-bg px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-base font-semibold text-brand-deep">
            Patient Monitor
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Prototype bedside vitals monitoring · Lusaka, Zambia
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-ink-muted">
          <Link href="/about" className="hover:text-brand">
            About
          </Link>
          <Link href="/contact" className="hover:text-brand">
            Contact
          </Link>
          <Link href="/docs" className="hover:text-brand">
            Docs
          </Link>
          <Link href="/login" className="hover:text-brand">
            Sign In
          </Link>
        </div>
      </div>
    </footer>
  );
}
