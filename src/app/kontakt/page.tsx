import type { Metadata } from "next";
import SkipLink from "@/components/SkipLink";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LotusRosette from "@/components/motifs/LotusRosette";
import SectionClose from "@/components/motifs/SectionClose";
import Reveal from "@/components/ui/Reveal";
import ContactForm from "@/components/kontakt/ContactForm";
import { navItems, contactEmail } from "@/content/site";
import { kontakt } from "@/content/kontakt";
import { EYEBROW } from "@/lib/layout";

export const metadata: Metadata = {
  title: kontakt.meta.title,
  description: kontakt.meta.description,
};

const PAGE_WIDTH =
  "mx-auto w-[min(100%-32px,1180px)] md:w-[min(100%-64px,1180px)] xl:w-[min(100%-96px,1180px)]";

export default function ContactPage() {
  const mailto = `mailto:${contactEmail}?subject=Kontakt%20med%20Nastaran`;
  return (
    <>
      <SkipLink href={`#${kontakt.sectionId}`}>Hoppa till innehåll</SkipLink>
      <SiteHeader items={navItems} />
      <main
        id={kontakt.sectionId}
        tabIndex={-1}
        className={`relative z-[1] ${PAGE_WIDTH} py-14 md:py-20 lg:py-24`}
      >
        {/* Contact page hero */}
        <section
          aria-labelledby={kontakt.heroHeadingId}
          className="grid items-center gap-6 overflow-hidden border border-accent/35 p-[clamp(34px,7vw,76px)] md:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]"
          style={{
            borderRadius: "30px",
            background:
              "radial-gradient(circle at 86% 10%, rgba(216,154,78,0.18), transparent 28vw), linear-gradient(145deg, var(--color-sandalwood), var(--color-lavender))",
          }}
        >
          <Reveal>
            <div>
              <p
                className={`mb-4 inline-flex items-center gap-2.5 ${EYEBROW} text-accent-deep`}
              >
                <LotusRosette className="h-[18px] w-[18px] text-copper" />
                {kontakt.kicker}
              </p>
              <h1
                id={kontakt.heroHeadingId}
                className="mb-4 font-serif font-medium tracking-[-0.018em] text-balance text-ink"
                style={{ fontSize: "clamp(46px, 8vw, 92px)", lineHeight: 0.96 }}
              >
                {kontakt.h1}
              </h1>
              <p className="max-w-[58ch] text-ink-muted text-body leading-[var(--text-body--line-height)]">
                {kontakt.intro}
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div
              id="email"
              className="relative max-w-[520px] border border-accent/40 p-[22px] shadow-card"
              style={{
                borderRadius: "24px",
                background: "color-mix(in srgb, var(--color-paper) 88%, white)",
              }}
            >
              <p className={`mb-3 ${EYEBROW} text-accent-deep`}>
                {kontakt.email.prelude}
              </p>
              <a
                href={mailto}
                className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-aubergine px-[18px] py-3 text-[15px] font-extrabold tracking-[-0.01em] text-paper shadow-cta transition-transform duration-200 ease-out hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 max-[560px]:w-full"
              >
                {kontakt.email.cta}
              </a>
              <p className="mt-4 mb-0 text-[15px] leading-6 text-ink-muted">
                {kontakt.email.note}
              </p>
            </div>
          </Reveal>
        </section>

        {/* Contact form section */}
        <section
          aria-labelledby={kontakt.form.headingId}
          className="mt-9 grid gap-7 overflow-hidden border border-hairline p-[clamp(28px,5vw,54px)] min-[980px]:grid-cols-[minmax(260px,0.55fr)_minmax(0,1fr)] min-[980px]:items-start"
          style={{
            borderRadius: "28px",
            background:
              "radial-gradient(circle at 92% 6%, rgba(216,154,78,0.12), transparent 220px), color-mix(in srgb, var(--color-paper) 86%, white)",
          }}
        >
          <Reveal>
            <div>
              <p className={`mb-3 ${EYEBROW} text-accent-deep`}>
                {kontakt.form.prelude}
              </p>
              <h2
                id={kontakt.form.headingId}
                className="mb-4 font-serif font-medium tracking-[-0.018em] text-balance text-ink text-h2 leading-[var(--text-h2--line-height)] md:text-h2-md md:leading-[var(--text-h2-md--line-height)]"
              >
                {kontakt.form.heading}
              </h2>
              <p className="max-w-[60ch] text-ink-muted text-body leading-[var(--text-body--line-height)]">
                {kontakt.form.body}
              </p>
            </div>
          </Reveal>
          <ContactForm email={contactEmail} />
        </section>

        {/* Flow */}
        <section
          aria-labelledby={kontakt.flow.headingId}
          className="mt-9 grid gap-6 overflow-hidden border border-hairline p-[clamp(28px,5vw,54px)] md:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)]"
          style={{
            borderRadius: "28px",
            background: "color-mix(in srgb, var(--color-paper) 88%, white)",
          }}
        >
          <Reveal>
            <div>
              <p className={`mb-3 ${EYEBROW} text-accent-deep`}>
                {kontakt.flow.prelude}
              </p>
              <h2
                id={kontakt.flow.headingId}
                className="font-serif font-medium tracking-[-0.018em] text-balance text-ink text-h2 leading-[var(--text-h2--line-height)] md:text-h2-md md:leading-[var(--text-h2-md--line-height)]"
              >
                {kontakt.flow.heading}
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <ol className="m-0 grid list-none gap-3.5 p-0">
              {kontakt.flow.rows.map(([num, text]) => (
                <li
                  key={num}
                  className="grid grid-cols-[46px_minmax(0,1fr)] items-baseline gap-3.5 border-b border-hairline py-[15px]"
                >
                  <span
                    className={`${EYEBROW} text-copper`}
                    style={{ letterSpacing: "0.075em" }}
                  >
                    {num}
                  </span>
                  <p className="m-0 text-ink text-body leading-[var(--text-body--line-height)]">
                    {text}
                  </p>
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* Deep note */}
        <section
          aria-labelledby={kontakt.safe.headingId}
          className="mt-9 overflow-hidden p-[clamp(34px,6vw,70px)] text-[#eadff0]"
          style={{
            borderRadius: "30px",
            background: "var(--color-aubergine)",
          }}
        >
          <Reveal>
            <LotusRosette className="mb-4 h-8 w-8 text-marigold" />
            <h2
              id={kontakt.safe.headingId}
              className="mb-4 font-serif font-medium tracking-[-0.018em] text-balance text-paper text-h2 leading-[var(--text-h2--line-height)] md:text-h2-md md:leading-[var(--text-h2-md--line-height)]"
            >
              {kontakt.safe.heading}
            </h2>
            <p className="max-w-[640px] text-[#eadff0] text-body leading-[var(--text-body--line-height)]">
              {kontakt.safe.body}
            </p>
            <SectionClose className="mt-9" tone="dark" />
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
