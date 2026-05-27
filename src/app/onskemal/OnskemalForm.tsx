"use client";

/**
 * Önskemål form. Page-prefilled from server props, submits to
 * `POST /api/feedback` (lands in PR D), maps server-side error codes to
 * friendly Swedish copy, and on success shows the request reference id.
 *
 * Until PR D ships the /api/feedback endpoint, submit will fail with an
 * http_404 error — that's expected for the PR C UI shell.
 */

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

const MESSAGE_MAX = 4000;

type Props = {
  initialPageId: string;
  initialPageLabel: string;
  defaultedToWholeSite: boolean;
};

const FIELD_LABEL = "block mb-1.5 text-[0.9rem] font-medium text-ink";
const FIELD_INPUT =
  "w-full px-4 py-3 rounded-xl bg-paper border border-hairline text-ink transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const BTN_PRIMARY =
  "inline-flex items-center gap-2 rounded-full bg-aubergine px-6 py-3 text-[0.92rem] font-medium text-paper shadow-cta transition hover:-translate-y-0.5 hover:bg-aubergine-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0";

export function OnskemalForm({
  initialPageId,
  initialPageLabel,
  defaultedToWholeSite,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messageLength, setMessageLength] = useState(0);

  const counterRatio = messageLength / MESSAGE_MAX;
  const counterColorClass =
    counterRatio >= 1
      ? "text-red-700 font-medium"
      : counterRatio >= 0.9
        ? "text-accent-deep"
        : "text-ink-muted";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(fd.get("name") ?? ""),
          page: String(fd.get("page") ?? ""),
          message: String(fd.get("message") ?? ""),
          website: String(fd.get("website") ?? ""), // honeypot
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { ok?: true; id?: string };
        setSubmitted({ id: data.id ?? "" });
        return;
      }
      let code = `http_${res.status}`;
      try {
        const data = (await res.json()) as { error?: string };
        if (data?.error) code = data.error;
      } catch {}
      switch (code) {
        case "rate_limit":
          setErrorMessage(
            "Du har skickat för många önskemål nyligen. Försök igen om en stund."
          );
          break;
        case "queue_full":
          setErrorMessage(
            "Kön är full just nu. Tack för att du försökte — försök igen om någon dag."
          );
          break;
        case "invalid_input":
        case "invalid_json":
        case "invalid_body":
          setErrorMessage(
            "Något i formuläret kunde inte tolkas. Kontrollera och försök igen."
          );
          break;
        case "payload_too_large":
          setErrorMessage(
            "Meddelandet är för stort. Korta ner texten och försök igen."
          );
          break;
        case "server_misconfigured":
          setErrorMessage(
            "Servern är inte färdig konfigurerad ännu. Försök igen senare."
          );
          break;
        case "write_failed":
          setErrorMessage(
            "Vi kunde inte spara önskemålet just nu. Försök igen om en stund."
          );
          break;
        case "unauthorized":
        case "http_401":
          setErrorMessage("Sessionen har gått ut. Logga in igen.");
          break;
        default:
          setErrorMessage(`Något gick fel (${code}). Försök igen.`);
      }
    } catch (err) {
      console.error("[onskemal] submit failed:", err);
      setErrorMessage("Nätverksfel. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-10 rounded-2xl bg-paper-deep p-8 text-center">
        <h2 className="text-2xl font-semibold text-aubergine">
          Tack — det är skickat ✓
        </h2>
        <p className="mt-3 text-ink-muted">
          Önskemålet är registrerat och hamnar i kön. Vi tittar på det så
          snart som möjligt.
        </p>
        {submitted.id && (
          <p className="mt-2 font-mono text-[0.78rem] text-ink-muted">
            Referens: {submitted.id}
          </p>
        )}
        <button
          type="button"
          onClick={() => setSubmitted(null)}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-aubergine/20 px-6 py-3 font-medium text-aubergine transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Skicka ett till
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 space-y-5 rounded-2xl border border-hairline bg-white p-6 shadow-card md:p-8"
    >
      {/* Page context — read-only chip, page id auto-filled from server */}
      <div>
        <span className={FIELD_LABEL}>Sida</span>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-paper px-4 py-3">
          <span className="text-[0.95rem] font-medium text-ink">
            {initialPageLabel}
          </span>
          {defaultedToWholeSite && (
            <span className="text-[0.78rem] text-ink-muted">
              (förvalt: hela sajten)
            </span>
          )}
        </div>
        <input type="hidden" name="page" value={initialPageId} readOnly />
        <p className="mt-1.5 text-[0.82rem] text-ink-muted">
          Önskemålet kopplas till den här sidan. Om du vill att det ska gälla
          hela sajten, gå till{" "}
          <a
            href="/onskemal"
            className="text-accent underline transition hover:text-accent-deep"
          >
            /onskemal
          </a>{" "}
          utan parameter.
        </p>
      </div>

      <div>
        <label htmlFor="namn" className={FIELD_LABEL}>
          Ditt namn{" "}
          <span className="font-normal text-ink-muted">(valfritt)</span>
        </label>
        <input
          id="namn"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Nastaran"
          className={FIELD_INPUT}
        />
      </div>

      <div>
        <label htmlFor="message" className={FIELD_LABEL}>
          Vad vill du ändra eller lägga till?
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          maxLength={MESSAGE_MAX}
          onChange={(e) => setMessageLength(e.currentTarget.value.length)}
          placeholder={`Exempel:
• Byt rubriken på Hem till …
• Lägg till en mening i berättelsen om …
• Uppdatera kontaktmejlen till …`}
          aria-describedby="message-counter"
          className={`${FIELD_INPUT} min-h-[140px] resize-y`}
        />
        <div className="mt-1 flex justify-end">
          <span
            id="message-counter"
            aria-live="polite"
            className={`text-[0.78rem] tabular-nums ${counterColorClass}`}
          >
            {messageLength} / {MESSAGE_MAX}
          </span>
        </div>
      </div>

      {/* Sensitive-content warning — required even pre-launch because the
          request text persists in main git history (see spec/pipeline-mvp.md
          § Sensitive-content warning). */}
      <p
        role="note"
        className="rounded-md border-l-2 border-accent bg-lavender/40 px-3 py-2 text-[0.82rem] leading-[1.55] text-ink"
      >
        Skicka inte personnummer, känsliga personuppgifter, lösenord eller
        annan privat information om dig själv eller andra. Allt du skriver i
        formuläret sparas i projektets versionshistorik på GitHub.
      </p>

      {/* Honeypot — bots fill, humans don't see */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website">Lämna detta tomt</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.9rem] text-red-700"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={BTN_PRIMARY}
      >
        {submitting ? "Skickar…" : "Skicka önskemål"}
        {!submitting && <ArrowRight size={18} aria-hidden="true" />}
      </button>
    </form>
  );
}
