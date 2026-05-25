import SkipLink from "@/components/SkipLink";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { navItems } from "@/content/site";

export default function Home() {
  return (
    <>
      <SkipLink href="#hem">Hoppa till innehåll</SkipLink>
      <SiteHeader items={navItems} />
      <main
        id="hem"
        tabIndex={-1}
        className="relative z-[1] mx-auto w-[min(100%-40px,560px)] py-14 sm:py-16 md:w-[min(100%-96px,672px)] md:py-20 lg:w-[min(100%-128px,896px)] lg:py-28 xl:w-[min(100%-192px,1180px)] xl:py-32"
      >
        <p className="text-eyebrow uppercase tracking-[0.075em] tabular-nums text-ink-muted">
          MS1 PR1
        </p>
        <h1 className="mt-4 font-serif text-display leading-[var(--text-display--line-height)] tracking-[-0.018em] text-ink md:text-display-md md:leading-[var(--text-display-md--line-height)] lg:text-display-lg lg:leading-[var(--text-display-lg--line-height)] xl:text-display-xl xl:leading-[var(--text-display-xl--line-height)]">
          Nastaran
        </h1>
        <p className="mt-4 max-w-[600px] text-body leading-[var(--text-body--line-height)] text-ink-muted">
          Shell is up. Home content lands in MS1 PR2.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
