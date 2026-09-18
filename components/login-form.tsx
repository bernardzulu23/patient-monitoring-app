"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const role = (data as { role?: string }).role;
        const dest = role === "nurse" ? "/dashboard/beds" : "/dashboard";
        router.push(dest);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: string }).error;
        if (res.status === 429) {
          setError(
            message || "Too many sign-in attempts. Try again in a few minutes.",
          );
        } else if (res.status >= 500) {
          setError("Sign-in is temporarily unavailable. Try again shortly.");
        } else {
          setError(message || "Invalid email or password");
        }
      }
    } catch {
      setError("Cannot reach the server. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 animate-rise"
      autoComplete="on"
    >
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          inputMode="email"
          maxLength={254}
          className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-ink mb-1.5"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            maxLength={72}
            className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 pr-11 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-alert-soft px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-deep py-2.5 text-sm font-semibold text-white transition hover:bg-brand disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <ForgotPasswordHint />
    </form>
  );
}

function ForgotPasswordHint() {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-brand hover:underline"
      >
        Forgot password?
      </button>
      {open && (
        <p className="mt-2 rounded-md border border-line bg-bg/60 px-3 py-2 text-left text-xs text-ink-muted">
          There is no email reset. Ask a hospital admin to issue a temporary
          password from <strong>Admin → Staff accounts</strong>, then change it
          under Settings after you sign in.
        </p>
      )}
    </div>
  );
}
