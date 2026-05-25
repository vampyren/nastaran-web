import LotusRosette from "@/components/motifs/LotusRosette";
import SectionClose from "@/components/motifs/SectionClose";
import TextCTA from "@/components/ui/TextCTA";
import Reveal from "@/components/ui/Reveal";
import { EYEBROW } from "@/lib/layout";
import { home } from "@/content/home";

const { contactTeaser } = home;

export default function ContactTeaser() {
  return (
    <section
      id={contactTeaser.sectionId}
      aria-labelledby={contactTeaser.headingId}
      className="relative scroll-mt-[76px] bg-[radial-gradient(circle_at_90%_10%,rgba(216,154,78,0.14),transparent_30vw),radial-gradient(circle_at_8%_90%,rgba(138,106,165,0.18),transparent_34vw),var(--color-aubergine)] py-20 px-5 text-[#eadff0] sm:px-6 md:px-7 lg:py-[106px] xl:py-[120px]"
    >
      <div className="mx-auto w-[min(100%,560px)] md:w-[min(100%,672px)] lg:grid lg:w-[min(100%,896px)] lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-x-14 xl:w-[min(100%,1180px)]">
        {/* Spine rail */}
        <div aria-hidden className="text-[#eadff0] lg:row-span-3">
          <span
            className="hidden font-serif font-medium tracking-[-0.02em] text-paper lg:block"
            style={{ fontSize: "clamp(64px, 7vw, 96px)", lineHeight: 0.86 }}
          >
            {contactTeaser.numeral}
          </span>
          <span className={`inline-flex items-center gap-2 ${EYEBROW} text-paper lg:mt-4`}>
            <LotusRosette className="h-3.5 w-3.5 text-marigold" />
            {contactTeaser.label}
          </span>
        </div>
        <div
          aria-hidden
          className="mt-3 mb-6 h-px w-full bg-[linear-gradient(90deg,var(--color-marigold),rgba(255,255,255,0.18),transparent)] lg:mt-3 lg:mb-0"
        />
        <div className="lg:row-span-3 lg:pt-5">
          <Reveal>
            <LotusRosette className="mb-4 h-8 w-8 text-marigold" />
            <p className={`mb-4 ${EYEBROW} text-paper`}>{contactTeaser.prelude}</p>
            <h2
              id={contactTeaser.headingId}
              className="mb-4 font-serif font-medium tracking-[-0.018em] text-balance text-paper text-h2 leading-[var(--text-h2--line-height)] md:text-h2-md md:leading-[var(--text-h2-md--line-height)]"
            >
              {contactTeaser.heading}
            </h2>
            <p className="max-w-[600px] text-body leading-[var(--text-body--line-height)] text-[#eadff0]">
              {contactTeaser.body}
            </p>
            <div className="mt-7">
              <TextCTA href={contactTeaser.cta.href} variant="dark">
                {contactTeaser.cta.label}
              </TextCTA>
            </div>
          </Reveal>
          <SectionClose className="mt-9" tone="dark" />
        </div>
      </div>
    </section>
  );
}
