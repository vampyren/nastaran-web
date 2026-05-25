// Swedish copy ported verbatim from old /om-mig page.tsx.
// Do not edit by hand — see spec/decisions-and-open-questions.md §D.

export const omMig = {
  sectionId: "om-mig",
  headingId: "about-heading",
  kicker: "Om mig",
  h1: "Ett varmt och tydligt möte med Nastaran.",
  intro:
    "Nastaran arbetar med healing, reiki och massage som komplementärt stöd för välmående. Tonen är lugn, saklig och varsam — med plats för stillhet utan överlöften.",
  ctas: {
    primary: { href: "/kontakt", label: "Kontakta Nastaran" },
    secondary: { href: "/berattelser", label: "Se berättelser och bilder" },
  },
  portrait: {
    src: "/assets/generated/nastaran-character-01.jpeg",
    alt: "Illustrerad porträttbild av Nastaran",
    width: 768,
    height: 1408,
    caption: "Nastaran",
    description:
      "Varm närvaro, mjuk estetik och en varsam ingång till healing, reiki och massage.",
  },
  approach: {
    headingId: "approach-heading",
    prelude: "Arbetssätt",
    heading: "Lugnt, respektfullt och utan överlöften.",
    body: "Det här är en plats för människor som söker stillhet, närvaro och mjuk återhämtning. Vid medicinska besvär, oro eller akuta symtom ska du alltid kontakta vården.",
  },
  values: {
    headingId: "values-heading",
    prelude: "Värden",
    heading: "Tre ord som håller sidan på rätt nivå.",
    rows: [
      ["Närvaro", "Ett möte i lugn takt, med utrymme för frågor och gränser."],
      ["Respekt", "Behandlingarna presenteras varsamt och utan medicinska anspråk."],
      ["Omsorg", "Fokus ligger på stillhet, beröring och ett tryggt rum för välmående."],
    ] as const,
  },
  meta: {
    title: "Om mig — Nastaran",
    description:
      "En varsam presentation av Nastarans arbete med healing, reiki och massage som komplementärt stöd för välmående.",
  },
} as const;
