import LotusRosette from "@/components/motifs/LotusRosette";
import TextCTA from "@/components/ui/TextCTA";
import SectionShell from "@/components/home/SectionShell";
import { home } from "@/content/home";

const { contactTeaser } = home;

/**
 * Section 06 — Kontakt. Uses the shared SectionShell editorial spine
 * with the dark aubergine tone. The lotus ornament rendered before the
 * prelude/heading is passed via leadOrnament.
 */
export default function ContactTeaser() {
  return (
    <SectionShell
      id={contactTeaser.sectionId}
      headingId={contactTeaser.headingId}
      numeral={contactTeaser.numeral}
      label={contactTeaser.label}
      prelude={contactTeaser.prelude}
      heading={contactTeaser.heading}
      body={contactTeaser.body}
      tone="aubergine"
      leadOrnament={<LotusRosette className="h-8 w-8 text-marigold" />}
    >
      <div className="mt-7">
        <TextCTA href={contactTeaser.cta.href} variant="dark">
          {contactTeaser.cta.label}
        </TextCTA>
      </div>
    </SectionShell>
  );
}
