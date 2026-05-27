import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/auth";
import { ALL_SITE_PAGE_ID, pageLabel, sanitizePageId } from "@/lib/pages";
import { OnskemalForm } from "./OnskemalForm";

export const metadata: Metadata = {
  title: "Skicka önskemål",
  description:
    "Berätta vad du vill ändra eller lägga till på Nastarans webbplats.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ page?: string }>;

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page } = await searchParams;
  const initialPageId = sanitizePageId(page);

  // Pre-launch: only the site owner submits requests. Gate the page
  // server-side and preserve the (sanitized) ?page=<id> through the
  // login round-trip via the URL-encoded `next` query param.
  //
  // Removal trigger (must be all true): site is past pre-launch, the
  // TEMPORARY footer Admin link has been removed, AND the validation
  // stack on /api/feedback has been re-verified end-to-end. See
  // spec/pipeline-mvp.md § Pre-launch admin-gating.
  if (!(await hasAdminSession())) {
    const nextUrl =
      initialPageId === ALL_SITE_PAGE_ID
        ? "/onskemal"
        : `/onskemal?page=${initialPageId}`;
    redirect(`/admin/login?next=${encodeURIComponent(nextUrl)}`);
  }

  const initialPageLabel = pageLabel(initialPageId);
  const isWholeSiteDefault = initialPageId === ALL_SITE_PAGE_ID;

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-2xl px-6 py-16 md:py-24"
    >
      <header>
        <span className="mb-3 inline-block text-[0.78rem] font-medium uppercase tracking-[0.08em] text-accent">
          Admin
        </span>
        <h1 className="text-[clamp(2.1rem,4.5vw,3.1rem)] font-bold leading-[1.2] tracking-[-0.025em] text-ink">
          Skicka önskemål
        </h1>
        <p className="mt-5 text-[1.05rem] leading-relaxed text-ink-muted">
          Beskriv en ändring eller ett tillägg du vill ha gjort på sajten. En
          operator plockar upp önskemålet och förbereder ändringen som ett
          förslag du sedan godkänner eller avvisar.
        </p>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">
          Inget publiceras direkt — varje ändring går genom en granskning med
          en preview-länk innan den når produktion.
        </p>
      </header>

      <OnskemalForm
        initialPageId={initialPageId}
        initialPageLabel={initialPageLabel}
        defaultedToWholeSite={isWholeSiteDefault}
      />
    </main>
  );
}
