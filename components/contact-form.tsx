"use client";

import { useState } from "react";

export function ContactForm() {
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
      body: JSON.stringify({ name, institution, message }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Could not send message");
      return;
    }
    setDone(true);
    setName("");
    setInstitution("");
    setMessage("");
  }

  if (done) {
    return (
      <div className="rounded-xl border border-ok bg-ok-soft px-4 py-6 text-sm text-ok">
        Thanks — your message was received. We will follow up if a reply is needed.
        <button
          type="button"
          className="mt-3 block font-semibold underline"
          onClick={() => setDone(false)}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Institution / organization
        </label>
        <input
          required
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          maxLength={180}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Message</label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={4000}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      {error && <p className="text-sm text-alert">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-brand-deep px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
