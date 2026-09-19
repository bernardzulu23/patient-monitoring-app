"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/docs", label: "Docs" },
  { href: "/contact", label: "Contact" },
];

const activeNav =
  "relative bg-[#0b6eb5] px-3 py-2 text-[#ffffff] after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-x-[6px] after:border-t-[6px] after:border-x-transparent after:border-t-[#0b6eb5]";
const idleNav = "px-3 py-2 text-[#1f2933] hover:text-[#0b6eb5]";

export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const authHref = signedIn ? "/dashboard" : "/login";
  const authLabel = signedIn ? "Dashboard" : "Sign In";

  return (
    <header className="relative z-30">
      <div className="bg-[#0b6eb5] text-[#ffffff]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-2 text-xs sm:text-sm">
          <p className="inline-flex items-center gap-1.5 text-[#ffffff]">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Lusaka, Zambia
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[#ffffff]">
            <Link href="/docs" className="hover:underline">
              Docs
            </Link>
            <Link href="/contact" className="hover:underline">
              Contact
            </Link>
            <Link href={authHref} className="hover:underline">
              {authLabel}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-[#d8dee6] bg-[#ffffff]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="group">
            <span className="font-display text-xl font-semibold tracking-tight text-[#064a7a] sm:text-2xl">
              Patient Monitor
            </span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
              Bedside vitals prototype
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1 text-xs font-semibold uppercase tracking-wide sm:text-sm">
            {links.map((l) => {
              const isActive =
                l.href === "/"
                  ? pathname === "/"
                  : pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={isActive ? activeNav : idleNav}
                >
                  {l.label}
                </Link>
              );
            })}
            <Link
              href={authHref}
              className={pathname === "/login" ? activeNav : idleNav}
            >
              {authLabel}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-[#d8dee6] bg-[#f4f7fa] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-[#064a7a]">
            Patient Monitor
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#4b5563]">
            Prototype bedside vitals monitoring for ward connectivity gaps ·
            Lusaka, Zambia
          </p>
        </div>
        <div className="flex flex-wrap gap-5 text-sm font-medium text-[#064a7a]">
          <Link href="/docs" className="hover:underline">
            Docs
          </Link>
          <Link href="/contact" className="hover:underline">
            Contact
          </Link>
          <Link href="/login" className="hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </footer>
  );
}
