"use client";

/**
 * Floating admin menu (bottom-right). Renders ONLY for visitors with a
 * valid admin cookie (probed via /api/admin/me on mount). Anonymous
 * visitors never see this — the public site stays clean.
 *
 * One compact button labelled "Admin" opens a small popover with three
 * entries:
 *
 *   - "Skicka önskemål" → /onskemal[?page=<id derived from current path>]
 *   - "Önskemålskö"    → /onskemal-kogen
 *   - "Admin"          → /admin
 *
 * Logout via /api/admin/logout + window.location.assign("/") triggers a
 * full reload, which remounts this component; the probe then returns 401
 * and the menu stays hidden.
 *
 * Hidden on /admin/login (no point on the auth page itself).
 *
 * Pages stay statically prerendered because this is a client component
 * that does its auth check after hydration.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench, MessageCircle, Inbox, LayoutGrid } from "lucide-react";
import { sanitizePageId } from "@/lib/pages";

const MENU_ITEM_CLASS =
  "grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg px-3 py-2 text-[0.88rem] text-ink transition hover:bg-paper focus-visible:bg-paper focus-visible:outline-none";

export default function AdminFAB() {
  const pathname = usePathname() ?? "/";
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Routes where the FAB should NOT appear even when authed.
  const hidden = pathname === "/admin/login";

  // Auth probe — avoids making every page dynamic just to gate a
  // client-side bubble.
  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    void fetch("/api/admin/me", { cache: "no-store" }).then(
      (res) => {
        if (!cancelled) setAuthed(res.ok);
      },
      () => {
        if (!cancelled) setAuthed(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [hidden, pathname]);

  // Close popover on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(t) &&
        buttonRef.current &&
        !buttonRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (hidden) return null;
  if (!authed) return null;

  // Page-aware deep-link to the form.
  const pageId = sanitizePageId(pathname);
  const onskemalHref =
    pageId === "hela-sajten" ? "/onskemal" : `/onskemal?page=${pageId}`;

  return (
    // Positioned ABOVE the ThemeSwitcher (which lives at bottom-4 right-4
    // desktop / bottom-3 right-3 mobile). Both share the same right edge so
    // they stack as a clean vertical pair. z-50 matches ThemeSwitcher so
    // neither hides the other if a layout shift ever brings them close.
    <div className="fixed bottom-20 right-4 z-50 max-[640px]:bottom-[68px] max-[640px]:right-3">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Adminmeny"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="admin-fab-menu"
        className="inline-flex items-center gap-2 rounded-full bg-aubergine px-4 py-3 text-[0.88rem] font-semibold text-paper shadow-cta transition hover:-translate-y-0.5 hover:bg-aubergine-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Wrench size={18} aria-hidden="true" className="text-marigold" />
        <span>Admin</span>
      </button>

      {open && (
        <div
          id="admin-fab-menu"
          ref={popoverRef}
          role="menu"
          aria-label="Adminmeny"
          className="absolute bottom-[calc(100%+0.5rem)] right-0 w-[220px] rounded-2xl border border-hairline bg-white p-2 shadow-card"
        >
          <Link
            href={onskemalHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={MENU_ITEM_CLASS}
          >
            <MessageCircle size={16} aria-hidden="true" className="text-accent" />
            <span>Skicka önskemål</span>
          </Link>
          <Link
            href="/onskemal-kogen"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={MENU_ITEM_CLASS}
          >
            <Inbox size={16} aria-hidden="true" className="text-accent" />
            <span>Önskemålskö</span>
          </Link>
          <Link
            href="/admin"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={MENU_ITEM_CLASS}
          >
            <LayoutGrid size={16} aria-hidden="true" className="text-accent" />
            <span>Admin</span>
          </Link>
        </div>
      )}
    </div>
  );
}
