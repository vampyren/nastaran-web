import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SkipLink from "@/components/SkipLink";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LotusRosette from "@/components/motifs/LotusRosette";
import SectionClose from "@/components/motifs/SectionClose";
import Reveal from "@/components/ui/Reveal";
import { navItems } from "@/content/site";
import { omMig } from "@/content/om-mig";
import { EYEBROW } from "@/lib/layout";

export const metadata: Metadata = {
  title: omMig.meta.title,
  description: omMig.meta.description,
};

const PAGE_WIDTH =
  "mx-auto w-[min(100%-32px,1180px)] md:w-[min(100%-64px,1180px)] xl:w-[min(100%-96px,1180px)]";

export default function AboutPage() {
  return (
    <>
      <SkipLink href={`#${omMig.sectionId}`}>Hoppa till innehåll</SkipLink>
      <SiteHeader items={navItems} />
      <main
        id={omMig.sectionId}
        tabIndex={-1}
        className={`relative z-[1] ${PAGE_WIDTH} py-14 md:py-20 lg:py-24`}
      >
        {/* About editorial — letter + portrait */}
        <section
          aria-labelledby={omMig.headingId}
          className="grid gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)] md:items-stretch"
        >
          <Reveal>
            <article
              className="relative h-full overflow-hidden border border-hairline p-[clamp(34px,4.6vw,64px)] text-ink"
              style={{
                borderRadius: "30px 30px 30px 90px",
                background:
                  "radial-gradient(circle at 12% 10%, rgba(126,74,139,0.08), transparent 30vw), linear-gradient(145deg, color-mix(in srgb, var(--color-paper) 88%, white), color-mix(in srgb, var(--color-lavender) 46%, white))",
              }}
            >
              <p
                className={`mb-4 inline-flex items-center gap-2.5 ${EYEBROW} text-accent-deep`}
              >
                <LotusRosette className="h-[18px] w-[18px] text-copper" />
                {omMig.kicker}
              </p>
              <h1
                id={omMig.headingId}
                className="mb-4 font-serif font-medium tracking-[-0.018em] text-balance text-ink"
                style={{ fontSize: "clamp(44px, 7vw, 86px)", lineHeight: 0.98 }}
              >
                {omMig.h1}
              </h1>
              <p className="max-w-[640px] mb-7 text-ink-muted text-body-lg leading-[var(--text-body-lg--line-height)]">
                {omMig.intro}
              </p>
              <div className="flex flex-wrap gap-3 max-[560px]:grid">
                <Link
                  href={omMig.ctas.primary.href}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-full px-[18px] py-3 text-[15px] font-extrabold tracking-[-0.01em] text-paper bg-aubergine shadow-cta transition-transform duration-200 ease-out hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 max-[560px]:w-full"
                >
                  {omMig.ctas.primary.label}
                </Link>
                <Link
                  href={omMig.ctas.secondary.href}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-hairline bg-white/60 px-[18px] py-3 text-[15px] font-extrabold tracking-[-0.01em] text-ink transition-transform duration-200 ease-out hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 max-[560px]:w-full"
                >
                  {omMig.ctas.secondary.label}
                </Link>
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.08}>
            <aside
              aria-label="Illustration av Nastaran"
              className="relative h-full overflow-hidden border border-hairline p-[clamp(20px,3vw,28px)] text-paper md:min-h-[320px]"
              style={{
                borderRadius: "30px 90px 30px 30px",
                background:
                  "radial-gradient(circle at 82% 18%, rgba(216,154,78,0.15), transparent 120px), linear-gradient(145deg, color-mix(in srgb, var(--color-aubergine) 93%, black), #3d224b)",
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-[18px] border border-white/15"
                style={{ borderRadius: "28px 78px 28px 28px" }}
              />
              <div
                className="relative z-[1] mx-auto w-[min(100%,310px)] overflow-hidden border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] shadow-card"
                style={{ borderRadius: "999px 999px 38px 38px" }}
              >
                <Image
                  src={omMig.portrait.src}
                  alt={omMig.portrait.alt}
                  width={omMig.portrait.width}
                  height={omMig.portrait.height}
                  priority
                  className="block h-[clamp(360px,47vw,520px)] w-full object-cover"
                  style={{ objectPosition: "56% 18%" }}
                  sizes="(min-width: 768px) 310px, 80vw"
                />
              </div>
              <span
                className={`relative z-[1] mt-auto block max-w-[18ch] ${EYEBROW} text-marigold`}
                style={{ letterSpacing: "0.085em", lineHeight: "18px" }}
              >
                {omMig.portrait.caption}
              </span>
              <p className="relative z-[1] mt-2.5 mb-0 max-w-[31ch] text-[#eadff0]">
                {omMig.portrait.description}
              </p>
            </aside>
          </Reveal>
        </section>

        {/* Approach */}
        <section
          aria-labelledby={omMig.approach.headingId}
          className="mt-9 grid gap-6 overflow-hidden border border-hairline p-[clamp(28px,5vw,54px)] md:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)]"
          style={{
            borderRadius: "28px",
            background: "color-mix(in srgb, var(--color-paper) 88%, white)",
          }}
        >
          <Reveal>
            <p className={`mb-3 ${EYEBROW} text-accent-deep`}>
              {omMig.approach.prelude}
            </p>
            <h2
              id={omMig.approach.headingId}
              className="font-serif font-medium tracking-[-0.018em] text-balance text-ink text-h2 leading-[var(--text-h2--line-height)] md:text-h2-md md:leading-[var(--text-h2-md--line-height)]"
            >
              {omMig.approach.heading}
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <div>
              <p className="m-0 text-ink-muted text-body leading-[var(--text-body--line-height)]">
                {omMig.approach.body}
              </p>
              <SectionClose className="mt-9" tone="warm" />
            </div>
          </Reveal>
        </section>

        {/* Values ledger */}
        <section
          aria-labelledby={omMig.values.headingId}
          className="mt-9 overflow-hidden border border-hairline p-[clamp(28px,5vw,54px)] md:grid md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:gap-9"
          style={{
            borderRadius: "28px",
            background:
              "radial-gradient(circle at 88% 8%, rgba(138,106,165,0.11), transparent 200px), linear-gradient(145deg, color-mix(in srgb, var(--color-lavender) 64%, white), color-mix(in srgb, var(--color-paper) 70%, white))",
          }}
        >
          <Reveal>
            <div>
              <p className={`mb-3 ${EYEBROW} text-accent-deep`}>
                {omMig.values.prelude}
              </p>
              <h2
                id={omMig.values.headingId}
                className="font-serif font-medium tracking-[-0.018em] text-balance text-ink text-h2 leading-[var(--text-h2--line-height)] md:text-h2-md md:leading-[var(--text-h2-md--line-height)]"
              >
                {omMig.values.heading}
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <dl className="mt-6 md:mt-0">
              {omMig.values.rows.map(([title, text]) => (
                <div
                  key={title}
                  className="grid gap-2 border-t border-accent/30 py-[18px] md:grid-cols-[132px_minmax(0,1fr)] md:items-baseline md:gap-x-5"
                >
                  <dt
                    className={`${EYEBROW} text-accent-deep m-0`}
                    style={{ fontWeight: 760 }}
                  >
                    {title}
                  </dt>
                  <dd className="m-0 text-ink text-body leading-[var(--text-body--line-height)]">
                    {text}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
