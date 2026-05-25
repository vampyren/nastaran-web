import type { Metadata } from "next";
import SkipLink from "@/components/SkipLink";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LotusRosette from "@/components/motifs/LotusRosette";
import Reveal from "@/components/ui/Reveal";
import GalleryCarousel from "@/components/berattelser/GalleryCarousel";
import { navItems } from "@/content/site";
import { berattelser, ceremonyImages } from "@/content/berattelser";
import { EYEBROW } from "@/lib/layout";

export const metadata: Metadata = {
  title: berattelser.meta.title,
  description: berattelser.meta.description,
};

const PAGE_WIDTH =
  "mx-auto w-[min(100%-32px,1180px)] md:w-[min(100%-64px,1180px)] xl:w-[min(100%-96px,1180px)]";

export default function StoriesPage() {
  return (
    <>
      <SkipLink href={`#${berattelser.sectionId}`}>Hoppa till innehåll</SkipLink>
      <SiteHeader items={navItems} />
      <main
        id={berattelser.sectionId}
        tabIndex={-1}
        className={`relative z-[1] ${PAGE_WIDTH} py-14 md:py-20 lg:py-24`}
      >
        {/* Stories intro */}
        <section
          aria-labelledby={berattelser.introHeadingId}
          className="border-y border-hairline py-[clamp(28px,7vw,72px)]"
        >
          <Reveal>
            <p
              className={`mb-4 inline-flex items-center gap-2.5 ${EYEBROW} text-accent-deep`}
            >
              <LotusRosette className="h-[18px] w-[18px] text-copper" />
              {berattelser.kicker}
            </p>
            <h1
              id={berattelser.introHeadingId}
              className="mb-4 font-serif font-medium tracking-[-0.018em] text-balance text-ink"
              style={{ fontSize: "clamp(44px, 7vw, 86px)", lineHeight: 0.98 }}
            >
              {berattelser.h1}
            </h1>
            <p className="max-w-[66ch] text-ink-muted text-body leading-[var(--text-body--line-height)]">
              {berattelser.intro}
            </p>
          </Reveal>
        </section>

        {/* Gallery section */}
        <section
          aria-labelledby={berattelser.gallery.headingId}
          className="mt-9 overflow-hidden border border-hairline-warm p-[clamp(28px,5vw,64px)]"
          style={{
            borderRadius: "30px",
            background: "var(--color-sandalwood)",
          }}
        >
          <Reveal>
            <div className="grid items-start gap-[18px] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:items-end">
              <div>
                <p className={`mb-3 ${EYEBROW} text-accent-deep`}>
                  {berattelser.gallery.prelude}
                </p>
                <h2
                  id={berattelser.gallery.headingId}
                  className="font-serif font-medium tracking-[-0.018em] text-balance text-ink text-h2 leading-[var(--text-h2--line-height)] md:text-h2-md md:leading-[var(--text-h2-md--line-height)]"
                >
                  {berattelser.gallery.heading}
                </h2>
              </div>
              <p className="m-0 max-w-[620px] text-ink-muted text-body leading-[var(--text-body--line-height)]">
                {berattelser.gallery.note}
              </p>
            </div>
            <GalleryCarousel images={ceremonyImages} />
          </Reveal>
        </section>

        {/* Story slots grid */}
        <section
          aria-label="Omdömesstruktur"
          className="mt-9 grid gap-4 overflow-hidden border border-hairline p-[clamp(28px,5vw,54px)] md:grid-cols-3"
          style={{
            borderRadius: "28px",
            background: "color-mix(in srgb, var(--color-paper) 90%, white)",
          }}
        >
          {berattelser.storySlots.map(([number, title, text]) => (
            <article
              key={title}
              className="border border-hairline p-6"
              style={{
                borderRadius: "24px 24px 46px 24px",
                background: "color-mix(in srgb, var(--color-lavender) 42%, white)",
              }}
            >
              <span className="block mb-6 font-serif text-[34px] leading-none text-copper">
                {number}
              </span>
              <h3 className="mb-3 font-serif font-medium text-[25px] text-ink">
                {title}
              </h3>
              <p className="m-0 text-ink-muted text-body leading-[var(--text-body--line-height)]">
                {text}
              </p>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
