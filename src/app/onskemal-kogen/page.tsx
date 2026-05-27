import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/auth";
import SkipLink from "@/components/SkipLink";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { navItems } from "@/content/site";
import { QueueBoard } from "./QueueBoard";

export const metadata: Metadata = {
  title: "Önskemålskö",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Admin queue board. Lives on production but requires the admin cookie.
 * Anonymous visitors are redirected to /admin/login with a next-param so
 * they land back here after authenticating.
 *
 * See spec/pipeline-mvp.md § Routes.
 */
export default async function Page() {
  if (!(await hasAdminSession())) {
    redirect("/admin/login?next=/onskemal-kogen");
  }

  return (
    <>
      <SkipLink href="#main-content">Hoppa till innehåll</SkipLink>
      <SiteHeader items={navItems} />
      <main
        id="main-content"
        className="relative z-[1] mx-auto w-full max-w-[1200px] flex-1 px-6 py-12 md:py-16"
      >
        <header className="mb-8">
          <span className="mb-3 inline-block text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-accent">
            Admin
          </span>
          <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-ink">
            Önskemålskö
          </h1>
          <p className="mt-3 text-[1rem] leading-relaxed text-ink-muted">
            Granska inkomna önskemål, godkänn eller avvisa ändringar. Endast
            synlig efter inloggning.
          </p>
        </header>

        <QueueBoard />
      </main>
      <SiteFooter />
    </>
  );
}
