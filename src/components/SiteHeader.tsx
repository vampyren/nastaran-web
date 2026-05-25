"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { NavItem } from "@/content/site";

function LotusMini() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className="h-[19px] w-[19px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 3c3.6 4.1 3.6 8.1 0 12.1C12.4 11.1 12.4 7.1 16 3Z" />
      <path d="M7 7.8c5.2.3 8.2 2.7 9 7.2-4.5-.8-7.4-3.2-9-7.2Z" />
      <path d="M25 7.8c-5.2.3-8.2 2.7-9 7.2 4.5-.8 7.4-3.2 9-7.2Z" />
      <path d="M5.2 17.5c4.5-2.1 8.1-1.4 10.8 2.1-4.2 1.4-7.8.7-10.8-2.1Z" />
      <path d="M26.8 17.5c-4.5-2.1-8.1-1.4-10.8 2.1 4.2 1.4 7.8.7 10.8-2.1Z" />
      <path d="M9.6 25.3c2.5-4.4 5.6-6.3 9.3-5.7-1.5 4.1-4.6 6-9.3 5.7Z" />
      <path d="M22.4 25.3c-2.5-4.4-5.6-6.3-9.3-5.7 1.5 4.1 4.6 6 9.3 5.7Z" />
      <circle cx="16" cy="16" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function sectionIdFromHref(href: string) {
  if (href === "/") return "hem";
  if (href.startsWith("#")) return href.slice(1);
  if (href.startsWith("/#")) return href.slice(2);
  return null;
}

function hrefMatchesPath(
  href: string,
  pathname: string,
  activeHashHref: string | null,
) {
  if (href === "/")
    return pathname === "/" && (!activeHashHref || activeHashHref === "/");
  if (href.startsWith("/#"))
    return pathname === "/" && activeHashHref === href;
  return pathname === href;
}

type Props = { items: readonly NavItem[] };

export default function SiteHeader({ items }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrollHashHref, setScrollHashHref] = useState<string | null>(null);
  // Derived: scroll-spy state is only meaningful on the home route.
  const activeHashHref = pathname === "/" ? scrollHashHref : null;

  const activeItem = useMemo(
    () =>
      items.find((item) =>
        hrefMatchesPath(item.href, pathname, activeHashHref),
      ) ??
      items.find((item) => item.href === pathname) ??
      items[0],
    [activeHashHref, items, pathname],
  );

  useEffect(() => {
    if (pathname !== "/") return undefined;

    const sections = items
      .map((item) => ({ item, id: sectionIdFromHref(item.href) }))
      .filter((entry): entry is { item: NavItem; id: string } =>
        Boolean(entry.id),
      )
      .map(({ item, id }) => ({ item, section: document.getElementById(id) }))
      .filter(
        (entry): entry is { item: NavItem; section: HTMLElement } =>
          Boolean(entry.section),
      );

    if (!sections.length) return undefined;

    let animationFrame = 0;
    const updateActiveSection = () => {
      const probeY = window.scrollY + 132;
      const current = sections.reduce((active, entry) => {
        const top = entry.section.getBoundingClientRect().top + window.scrollY;
        return top <= probeY ? entry.item.href : active;
      }, sections[0]?.item.href ?? "/");
      setScrollHashHref(current);
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
    };
  }, [items, pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.documentElement.toggleAttribute("data-menu-open", open);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.documentElement.removeAttribute("data-menu-open");
    };
  }, [open]);

  const renderNav = (variant: "desktop" | "mobile") => (
    <nav
      aria-label="Huvudmeny"
      className={
        variant === "desktop"
          ? "ml-auto hidden items-center gap-[clamp(10px,1.35vw,20px)] font-semibold text-ink-muted md:flex"
          : "border-t border-hairline"
      }
    >
      {items.map((item) => {
        const current = hrefMatchesPath(item.href, pathname, activeHashHref);
        if (variant === "desktop") {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={[
                "relative inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap text-eyebrow uppercase tracking-[0.075em] tabular-nums",
                "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4",
                current
                  ? "text-ink after:absolute after:inset-x-0 after:bottom-2 after:h-px after:bg-accent"
                  : "hover:text-ink",
              ].join(" ")}
            >
              <span className="text-accent">{item.number}</span>
              <span>{item.label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={[
              "grid min-h-[56px] grid-cols-[46px_minmax(0,1fr)] items-center gap-3.5 border-b border-hairline text-[17px] tracking-[-0.01em]",
              "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4",
              current ? "text-accent-deep" : "text-ink",
            ].join(" ")}
          >
            <span className="text-accent text-eyebrow uppercase tracking-[0.075em] tabular-nums">
              {item.number}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Frosted veil — same footprint as the menu pill, extends upward to
          the top of the viewport. Two crossed mask gradients fade the top
          and both sides to invisible, leaving only a soft glossy halo above
          the menu pill. No visible perimeter, even on pages with contrast
          backgrounds. Rendered inside SiteHeader so pages without a menu
          (e.g. 404) don't render it at all. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[55] flex justify-center"
      >
        <div
          className="h-[64px] w-[min(calc(100%-32px),1180px)] rounded-[22px] md:h-[72px] lg:h-[76px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.95) 12%, rgba(244,234,248,0.86) 24%, rgba(244,234,248,0.8) 100%)",
            backdropFilter: "blur(20px) saturate(1.12)",
            WebkitBackdropFilter: "blur(20px) saturate(1.12)",
            maskImage:
              "linear-gradient(180deg, transparent 0%, black 22%, black 100%), linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(180deg, transparent 0%, black 22%, black 100%), linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        />
      </div>
      <header
        aria-label="Sidhuvud"
        className="sticky top-3 z-[60] mx-auto mt-3 flex h-[52px] w-[min(calc(100%-32px),1180px)] items-center justify-between gap-3.5 overflow-hidden rounded-[22px] border border-white/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,234,248,0.82))] px-3.5 shadow-rail ring-1 ring-inset ring-white/40 backdrop-blur-xl sm:px-4 md:h-[60px] md:px-[22px] lg:h-16 lg:px-[26px]"
      >
        {/* Glossy highlight strip */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.55),transparent)]"
        />
        <Link
          href="/"
          aria-label="Till startsidan"
          onClick={() => setOpen(false)}
          className="inline-flex min-w-0 max-w-[54%] items-center gap-2.5 overflow-hidden whitespace-nowrap font-extrabold text-ink focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4"
        >
          <span
            aria-hidden
            className="inline-grid h-7 w-7 flex-none place-items-center rounded-full border border-accent/40 bg-[color-mix(in_srgb,var(--color-paper)_82%,white)] text-accent-deep"
          >
            <LotusMini />
          </span>
          <span className="truncate text-eyebrow uppercase tracking-[0.075em] tabular-nums">
            Nastaran
          </span>
        </Link>
        {renderNav("desktop")}
        <span className="ml-auto hidden whitespace-nowrap text-right text-eyebrow uppercase tracking-[0.075em] tabular-nums text-ink-muted md:inline-block lg:hidden">
          {activeItem ? `${activeItem.number} / ${activeItem.label}` : "01 / Hem"}
        </span>
        <button
          type="button"
          aria-controls="mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 border-0 bg-transparent font-extrabold text-ink focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 md:hidden"
        >
          <span className="text-eyebrow uppercase tracking-[0.075em] tabular-nums">
            {open ? "Stäng" : "Meny"}
          </span>
          <span
            aria-hidden
            className="relative inline-block h-[9px] w-[18px]"
          >
            <span
              className={`absolute left-0 h-px w-[18px] bg-accent transition-transform duration-200 ease-out ${open ? "top-1 rotate-[24deg]" : "top-px"}`}
            />
            <span
              className={`absolute left-0 h-px w-[18px] bg-accent transition-transform duration-200 ease-out ${open ? "top-1 -rotate-[24deg]" : "top-[7px]"}`}
            />
          </span>
        </button>
      </header>
      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-x-4 top-[76px] z-[50] mx-auto max-w-[1180px] rounded-[22px] border border-hairline bg-[color-mix(in_srgb,var(--color-paper)_98%,white)] p-[18px] shadow-card md:hidden"
      >
        <p className="mb-3.5 text-eyebrow uppercase tracking-[0.075em] tabular-nums text-ink-muted">
          Sidor
        </p>
        {renderNav("mobile")}
      </div>
    </>
  );
}
