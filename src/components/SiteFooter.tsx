import Link from "next/link";
import LotusRosette from "./motifs/LotusRosette";

export default function SiteFooter() {
  return (
    <footer className="relative z-[1] mt-0 w-full bg-aubergine px-4 pb-9 pt-0 text-[#c9b8d4]">
      {/* Top dot pattern strip — marigold polka above the footer content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-3 opacity-[0.32]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-marigold) 1px, transparent 1.5px)",
          backgroundSize: "18px 12px",
        }}
      />
      <div className="relative z-[1] mx-auto flex min-h-[72px] w-full max-w-[1180px] items-center justify-between gap-3 border-t border-white/10 px-[22px] pt-7 text-eyebrow uppercase tracking-[0.075em] tabular-nums max-[640px]:px-3.5">
        <span className="inline-flex items-center gap-2">
          <LotusRosette className="h-4 w-4 text-marigold" />
          Nastaran · © {new Date().getFullYear()}
        </span>
        <span className="inline-flex items-center gap-5">
          {/* TEMPORARY — admin shortcut for pre-launch only. Remove
              before public launch (alongside lifting the /onskemal page
              + /api/feedback admin-gating per spec/pipeline-mvp.md
              § Pre-launch admin-gating, removal trigger). Visible to
              everyone right now because the whole site is pre-launch. */}
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] items-center focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4"
          >
            Admin
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4"
          >
            Hem
          </Link>
        </span>
      </div>
    </footer>
  );
}
