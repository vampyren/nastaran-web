import Image from "next/image";
import BootiField from "@/components/motifs/BootiField";
import LotusRosette from "@/components/motifs/LotusRosette";
import TextCTA from "@/components/ui/TextCTA";
import Reveal from "@/components/ui/Reveal";
import { EYEBROW, HAIRLINE_GRADIENT, SECTION_WIDTH } from "@/lib/layout";
import { home } from "@/content/home";

const { hero } = home;

export default function Hero() {
  return (
    <section
      id={hero.sectionId}
      tabIndex={-1}
      aria-labelledby={hero.headingId}
      className={`relative scroll-mt-[76px] pt-10 pb-14 md:pt-12 md:pb-16 lg:pt-[88px] lg:pb-[108px] xl:pt-28 xl:pb-32`}
    >
      <div
        className={`${SECTION_WIDTH} lg:grid lg:grid-cols-[220px_minmax(0,1fr)_minmax(260px,330px)] lg:gap-x-[46px] lg:items-stretch xl:grid-cols-[220px_minmax(0,680px)_minmax(300px,380px)]`}
      >
        {/* Mobile/tablet rail (hidden at lg+) */}
        <div
          aria-hidden
          className="text-ink-muted lg:hidden"
        >
          <span className={`inline-flex items-center gap-2 ${EYEBROW}`}>
            <LotusRosette className="h-3.5 w-3.5 text-copper" />
            Hem
          </span>
        </div>
        <div aria-hidden className={`mt-3 mb-6 ${HAIRLINE_GRADIENT} lg:hidden`} />
        {/* Empty spine column at lg+ */}
        <div aria-hidden className="hidden lg:block lg:row-span-3" />
        {/* Hero copy */}
        <div className="lg:row-span-3 lg:pt-5">
          <Reveal>
            <p className={`mb-4 ${EYEBROW} text-accent-deep`}>{hero.prelude}</p>
            <h1
              id={hero.headingId}
              className="mb-4 font-serif font-medium tracking-[-0.018em] text-balance text-ink text-display leading-[var(--text-display--line-height)] md:text-display-md md:leading-[var(--text-display-md--line-height)] lg:text-display-lg lg:leading-[var(--text-display-lg--line-height)] xl:text-display-xl xl:leading-[var(--text-display-xl--line-height)] lg:max-w-[760px]"
            >
              {hero.h1}
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mb-3.5 max-w-[17ch] font-serif italic font-normal tracking-[-0.005em] text-ink text-intro leading-[var(--text-intro--line-height)] md:text-intro-md md:leading-[var(--text-intro-md--line-height)] md:max-w-[20ch]">
              {hero.intro}
            </p>
            <p className="max-w-[580px] mb-0 text-ink-muted text-body-lg leading-[var(--text-body-lg--line-height)]">
              {hero.body}
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <dl
              aria-label="Kort översikt"
              className="mt-6 border-t border-hairline"
            >
              {hero.facts.map(([term, description]) => (
                <div
                  key={term}
                  className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-x-4 border-b border-hairline py-[13px] md:grid-cols-[132px_minmax(0,1fr)]"
                >
                  <dt className={`m-0 ${EYEBROW} text-ink-muted`}>{term}</dt>
                  <dd className="m-0 text-ink text-[16px] leading-6">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-6">
              <TextCTA href={hero.cta.href}>{hero.cta.label}</TextCTA>
            </div>
          </Reveal>
        </div>
        {/* Ritual panel */}
        <Reveal
          delay={0.12}
          className="mt-7 lg:row-span-3 lg:mt-0 lg:self-stretch"
        >
          <aside
            aria-label="Visuell signatur"
            className="relative min-h-[190px] overflow-hidden border border-hairline bg-lavender text-accent-deep px-6 pt-7 pb-7 lg:min-h-[520px]"
            style={{ borderRadius: "26px 26px 70px 26px" }}
          >
            <Image
              className="object-cover -z-0"
              src={hero.image.src}
              alt={hero.image.alt}
              aria-hidden={hero.image.alt === "" ? true : undefined}
              fill
              sizes="(min-width: 1100px) 380px, (min-width: 768px) 50vw, 100vw"
              priority
              style={{ objectPosition: "center 32%" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(234,216,244,0.86) 0%, rgba(234,216,244,0.34) 32%, rgba(234,216,244,0.18) 58%, rgba(234,216,244,0.74) 86%, rgba(234,216,244,0.94) 100%)",
              }}
            />
            <BootiField className="absolute inset-y-[-20px] right-0 z-[1] h-[120%] w-[54%] text-accent-deep opacity-[0.17]" />
            <LotusRosette className="relative z-[1] h-[72px] w-[72px] text-accent-deep lg:h-[106px] lg:w-[106px]" />
            <div aria-hidden className="relative my-7 h-[30px] lg:mt-[260px] lg:h-9" />
            <span
              className={`relative z-[1] ${EYEBROW} text-ink-muted lg:text-[16px] lg:tracking-[0.075em]`}
            >
              {hero.ritualCaption}
            </span>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
