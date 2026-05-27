"use client";

/**
 * Owner-hub body. Four primary actions, rendered as a 1- or 2-column grid
 * of card-style buttons. Client component because "Logga ut" needs a
 * fetch + redirect.
 *
 * Auth is enforced upstream in src/app/admin/page.tsx; this component is
 * only rendered when the visitor already has a valid admin cookie.
 */

import Link from "next/link";
import { MessageCircle, Inbox, ExternalLink, LogOut } from "lucide-react";

const TILE_CLASS =
  "inline-flex items-center gap-3 rounded-2xl border border-hairline bg-white px-5 py-4 text-[0.95rem] font-medium text-ink shadow-card transition hover:-translate-y-0.5 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function AdminHub() {
  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Swallow — the redirect below still clears the in-page state by
      // forcing a full reload; the server cookie deletion is best-effort.
    }
    window.location.assign("/");
  }

  return (
    <div className="grid max-w-[640px] gap-3 sm:grid-cols-2">
      <Link href="/onskemal" className={TILE_CLASS}>
        <MessageCircle size={18} aria-hidden="true" className="text-accent" />
        <span>Skicka önskemål</span>
      </Link>
      <Link href="/onskemal-kogen" className={TILE_CLASS}>
        <Inbox size={18} aria-hidden="true" className="text-accent" />
        <span>Önskemålskö</span>
      </Link>
      <Link href="/" className={TILE_CLASS}>
        <ExternalLink size={18} aria-hidden="true" className="text-accent" />
        <span>Visa webbplatsen</span>
      </Link>
      <button
        type="button"
        onClick={() => void handleLogout()}
        aria-label="Logga ut"
        className={TILE_CLASS}
      >
        <LogOut size={18} aria-hidden="true" className="text-accent" />
        <span>Logga ut</span>
      </button>
    </div>
  );
}
