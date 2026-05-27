import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/auth";
import { AdminHub } from "./AdminHub";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Owner hub. Lives on production but requires the admin cookie.
 * Anonymous visitors are redirected to /admin/login with a next-param so
 * they land back here after authenticating.
 *
 * Entry point for day-to-day work: the temporary footer "Admin" link and
 * the floating AdminFAB both target this route. From here Nastaran
 * reaches /onskemal (submit a request), /onskemal-kogen (queue board),
 * the live site, and Logga ut.
 *
 * See docs/PIPELINE-HANDOFF.md § 5 — "How the owner uses the pipeline".
 */
export default async function Page() {
  if (!(await hasAdminSession())) {
    redirect("/admin/login?next=/admin");
  }

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-[1200px] px-6 py-12 md:py-16"
    >
      <header className="mb-8">
        <span className="mb-3 inline-block text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-accent">
          Admin
        </span>
        <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-ink">
          Admin
        </h1>
        <p className="mt-3 text-[1rem] leading-relaxed text-ink-muted">
          Verktyg för att uppdatera Nastarans webbplats.
        </p>
      </header>

      <AdminHub />
    </main>
  );
}
