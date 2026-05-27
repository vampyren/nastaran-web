"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const FIELD_LABEL = "block mb-1.5 text-[0.9rem] font-medium text-ink";
const FIELD_INPUT =
  "w-full px-4 py-3 rounded-xl bg-paper border border-hairline text-ink transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-full bg-aubergine px-6 py-3 text-[0.92rem] font-semibold text-paper shadow-cta transition hover:-translate-y-0.5 hover:bg-aubergine-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0";

type ApiError = { error?: string };

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Use replace so the back button doesn't go back to the login form.
        router.replace(next);
        return;
      }
      let data: ApiError = {};
      try {
        data = (await res.json()) as ApiError;
      } catch {}
      const code = data?.error ?? `http_${res.status}`;
      if (code === "invalid_credentials") setError("Fel lösenord.");
      else if (code === "payload_too_large") setError("För stort meddelande.");
      else if (code === "server_misconfigured")
        setError("Servern är inte konfigurerad ännu. Kontakta admin.");
      else setError(`Något gick fel (${code}).`);
    } catch (err) {
      console.error(err);
      setError("Nätverksfel. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-2xl bg-white p-6 shadow-card md:p-8"
      noValidate
    >
      <div>
        <label htmlFor="admin-password" className={FIELD_LABEL}>
          Lösenord
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={FIELD_INPUT}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.9rem] text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || password.length === 0}
        className={`mt-6 w-full ${BTN_PRIMARY}`}
      >
        {submitting ? "Loggar in…" : "Logga in"}
      </button>
    </form>
  );
}
