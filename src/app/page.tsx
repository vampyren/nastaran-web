import SkipLink from "@/components/SkipLink";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaisleyDivider from "@/components/motifs/PaisleyDivider";
import Hero from "@/components/home/Hero";
import SectionShell from "@/components/home/SectionShell";
import TreatmentPanels from "@/components/home/TreatmentPanels";
import RhythmStrip from "@/components/home/RhythmStrip";
import PreparationList from "@/components/home/PreparationList";
import InformationLedger from "@/components/home/InformationLedger";
import ContactTeaser from "@/components/home/ContactTeaser";
import { navItems } from "@/content/site";
import { home } from "@/content/home";

export default function Home() {
  return (
    <>
      <SkipLink href="#hem">Hoppa till innehåll</SkipLink>
      <SiteHeader items={navItems} />
      <main className="relative z-[1]">
        <Hero />

        <PaisleyDivider className="my-2" />

        <SectionShell
          id={home.treatments.sectionId}
          headingId={home.treatments.headingId}
          numeral={home.treatments.numeral}
          label={home.treatments.label}
          index={home.treatments.index}
          heading={home.treatments.heading}
          pullQuote={home.treatments.pullQuote}
          body={home.treatments.body}
        >
          <TreatmentPanels rows={home.treatments.rows} />
        </SectionShell>

        <RhythmStrip />

        <SectionShell
          id={home.preparation.sectionId}
          headingId={home.preparation.headingId}
          numeral={home.preparation.numeral}
          label={home.preparation.label}
          index={home.preparation.index}
          heading={home.preparation.heading}
          body={home.preparation.body}
          tone="sandalwood"
        >
          <PreparationList rows={home.preparation.rows} />
        </SectionShell>

        <SectionShell
          id={home.information.sectionId}
          headingId={home.information.headingId}
          numeral={home.information.numeral}
          label={home.information.label}
          index={home.information.index}
          heading={home.information.heading}
          body={home.information.body}
        >
          <InformationLedger
            rows={home.information.rows}
            importantLabel={home.information.importantLabel}
          />
        </SectionShell>

        <PaisleyDivider className="my-2" />

        <ContactTeaser />
      </main>
      <SiteFooter />
    </>
  );
}
