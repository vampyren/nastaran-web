"use client";

/**
 * Önskemål form. Page-prefilled from server props, submits to
 * `POST /api/feedback`, maps server-side error codes to friendly Swedish
 * copy, and on success shows the request reference id.
 *
 * Two submission shapes:
 *   - No attachments  → JSON POST (legacy path, preserved verbatim).
 *   - 1–3 attachments → multipart/form-data POST with each file under
 *     the field name `attachments`.
 *
 * Attachment client-side guardrails (the server re-validates everything,
 * including a magic-byte sniff that browsers can't fake):
 *   - 1–3 images, each ≤ 5 MB
 *   - Accepted mime types: image/png, image/jpeg, image/webp
 *   - Selected files are shown with size + remove button before submit
 */

import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, ImagePlus, X } from "lucide-react";

const MESSAGE_MAX = 4000;

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPT_MIME = "image/png,image/jpeg,image/webp";
const ALLOWED_MIME: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

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

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function OnskemalForm({
  initialPageId,
  initialPageLabel,
  defaultedToWholeSite,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messageLength, setMessageLength] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsHelpId = useId();

  const counterRatio = messageLength / MESSAGE_MAX;
  const counterColorClass =
    counterRatio >= 1
      ? "text-red-700 font-medium"
      : counterRatio >= 0.9
        ? "text-accent-deep"
        : "text-ink-muted";

  function handleFilePick(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    // Append to the existing selection, but cap at MAX_ATTACHMENTS and
    // filter out duplicates by (name + size). The input is reset after
    // each pick so the same file can be re-added if it was removed.
    const merged: File[] = [...files];
    for (const f of picked) {
      if (merged.length >= MAX_ATTACHMENTS) break;
      if (!ALLOWED_MIME.has(f.type)) {
        setErrorMessage(
          "Endast PNG, JPG och WebP är tillåtna som bilagor."
        );
        continue;
      }
      if (f.size > MAX_ATTACHMENT_BYTES) {
        setErrorMessage(
          `Bilagan "${f.name}" är större än 5 MB och kan inte bifogas.`
        );
        continue;
      }
      if (merged.some((m) => m.name === f.name && m.size === f.size)) continue;
      merged.push(f);
    }
    setFiles(merged);
    // Reset the input so re-picking the same file after a remove works.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    const page = String(fd.get("page") ?? "");
    const message = String(fd.get("message") ?? "");
    const website = String(fd.get("website") ?? ""); // honeypot

    try {
      let res: Response;
      if (files.length > 0) {
        // Multipart path. The browser sets Content-Type with boundary
        // automatically — do NOT set it manually.
        const form = new FormData();
        form.set("name", name);
        form.set("page", page);
        form.set("message", message);
        form.set("website", website);
        for (const file of files) {
          form.append("attachments", file, file.name);
        }
        res = await fetch("/api/feedback", { method: "POST", body: form });
      } else {
        res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, page, message, website }),
        });
      }
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
            "Meddelandet eller bilagorna är för stora. Korta ner eller ta bort bilagor och försök igen."
          );
          break;
        case "too_many_files":
          setErrorMessage(
            `Max ${MAX_ATTACHMENTS} bilagor per önskemål.`
          );
          break;
        case "file_type_invalid":
          setErrorMessage(
            "Endast PNG, JPG och WebP är tillåtna som bilagor."
          );
          break;
        case "file_too_large":
          setErrorMessage(
            "Minst en bilaga är större än 5 MB. Komprimera eller välj en mindre fil."
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
          onClick={() => {
            setSubmitted(null);
            setFiles([]);
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-aubergine/20 px-6 py-3 font-medium text-aubergine transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Skicka ett till
        </button>
      </div>
    );
  }

  const atLimit = files.length >= MAX_ATTACHMENTS;

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

      {/* Attachments */}
      <div>
        <span className={FIELD_LABEL}>
          Bilagor{" "}
          <span className="font-normal text-ink-muted">
            (valfritt, max {MAX_ATTACHMENTS} bilder)
          </span>
        </span>
        <p
          id={attachmentsHelpId}
          className="mb-2 text-[0.82rem] leading-[1.5] text-ink-muted"
        >
          Du kan bifoga skärmbilder som förklaring, eller bilder som ska
          användas/ersätta bild på sidan. PNG, JPG eller WebP, högst 5 MB
          per bild.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={atLimit}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-white px-4 text-[0.85rem] font-medium text-ink transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
            aria-describedby={attachmentsHelpId}
          >
            <ImagePlus size={16} aria-hidden="true" />
            {atLimit ? "Max nått" : "Välj bilder…"}
          </button>
          <span className="text-[0.78rem] text-ink-muted">
            {files.length} / {MAX_ATTACHMENTS}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_MIME}
          multiple
          hidden
          onChange={handleFilePick}
        />
        {files.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${f.size}-${i}`}
                className="flex items-center gap-2 rounded-xl border border-hairline bg-paper px-3 py-2 text-[0.85rem]"
              >
                <span className="truncate text-ink" title={f.name}>
                  {f.name}
                </span>
                <span className="ml-auto shrink-0 font-mono text-[0.78rem] text-ink-muted">
                  {fmtBytes(f.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Ta bort ${f.name}`}
                  className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-white hover:text-aubergine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
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
        formuläret — inklusive bilagor — sparas i projektets versionshistorik
        på GitHub.
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

      <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
        {submitting ? "Skickar…" : "Skicka önskemål"}
        {!submitting && <ArrowRight size={18} aria-hidden="true" />}
      </button>
    </form>
  );
}
