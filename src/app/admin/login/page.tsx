import type { Metadata } from "next";
import { hasAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin — logga in",
  robots: { index: false, follow: false },
};

// `next` query param: where to land after a successful login. Sanitized
// server-side to a same-origin pathname.
type SearchParams = Promise<{ next?: string }>;

function sanitizeNext(raw?: string): string {
  if (!raw) return "/admin";
  // Only allow site-relative paths starting with a single "/" (no //, no protocol).
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/admin";
}

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next } = await searchParams;
  const safeNext = sanitizeNext(next);

  // If already logged in, jump straight to the destination.
  if (await hasAdminSession()) {
    redirect(safeNext);
  }

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-md px-6 py-[4.5rem]"
    >
      <header>
        <span className="mb-3 inline-block text-[0.78rem] font-medium uppercase tracking-[0.08em] text-accent">
          Admin
        </span>
        <h1 className="text-[clamp(2.1rem,4.5vw,3.1rem)] font-bold leading-[1.2] tracking-[-0.025em] text-ink">
          Logga in
        </h1>
        <p className="mt-5 text-[1.05rem] leading-relaxed text-ink-muted">
          Behövs för att skicka och granska önskemål. Inte avsett för
          besökare.
        </p>
      </header>

      <LoginForm next={safeNext} />
    </main>
  );
}
