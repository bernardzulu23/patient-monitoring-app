"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";

/** Compact demo inquiry — posts to the same /api/contact as the full contact form. */
export function InquiryStrip() {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        institution,
        message: message.trim() || "Demo / evaluator inquiry from landing page.",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Could not send inquiry");
      return;
    }
    setDone(true);
    setName("");
    setInstitution("");
    setMessage("");
  }

  if (done) {
    return (
      <div className="relative z-20 -mt-10 px-4 sm:-mt-14 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 bg-[#3a3f45] px-6 py-8 text-center text-sm text-[#f8fafc]">
          Thanks — your inquiry was received. We will follow up if a reply is needed.
          <button
            type="button"
            className="font-semibold text-[#c5e05a] underline"
            onClick={() => setDone(false)}
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-20 -mt-10 px-4 sm:-mt-14 sm:px-6">
      <form
        onSubmit={onSubmit}
        className="mx-auto flex max-w-6xl flex-col overflow-hidden shadow-lg lg:flex-row"
      >
        <div className="flex shrink-0 items-center gap-3 bg-[#0b6eb5] px-6 py-5 lg:w-52 lg:flex-col lg:items-start lg:justify-center">
          <CalendarDays className="h-8 w-8 text-[#ffffff]" aria-hidden />
          <p className="font-display text-lg leading-tight italic text-[#ffffff] sm:text-xl">
            Request a demo
          </p>
        </div>

        <div className="grid flex-1 gap-3 bg-[#3a3f45] px-4 py-4 sm:grid-cols-3 sm:items-end sm:gap-4 sm:px-5">
          <label className="block text-xs font-medium text-[#e5e7eb]">
            Full name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Your name"
              className="mt-1 w-full border-0 bg-[#ffffff] px-3 py-2.5 text-sm text-[#1f2933] outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#0b6eb5]"
            />
          </label>
          <label className="block text-xs font-medium text-[#e5e7eb]">
            Institution
            <input
              required
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              maxLength={180}
              placeholder="Hospital / university"
              className="mt-1 w-full border-0 bg-[#ffffff] px-3 py-2.5 text-sm text-[#1f2933] outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#0b6eb5]"
            />
          </label>
          <label className="block text-xs font-medium text-[#e5e7eb]">
            Message
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={4000}
              placeholder="Brief note (optional)"
              className="mt-1 w-full border-0 bg-[#ffffff] px-3 py-2.5 text-sm text-[#1f2933] outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#0b6eb5]"
            />
          </label>
          {error && (
            <p className="text-sm text-[#fecaca] sm:col-span-3">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="shrink-0 bg-[#9fc43a] px-6 py-5 text-sm font-bold uppercase tracking-wide text-[#1a2e05] transition hover:bg-[#8ab032] disabled:opacity-60 lg:w-44"
        >
          {busy ? "Sending…" : "Send inquiry"}
        </button>
      </form>
    </div>
  );
}
