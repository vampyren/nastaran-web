// Swedish copy ported verbatim from old /berattelser page.tsx + siteData.ts.

export const ceremonyImages = [
  {
    title: "Stillhet före behandling",
    tone: "Ljus, textil och mjuk närvaro",
    src: "https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=1400&q=80",
    credit: "Exempelbild från Unsplash",
  },
  {
    title: "Ceremoniell värme",
    tone: "Blommor, händer och långsam rytm",
    src: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1400&q=80",
    credit: "Exempelbild från Unsplash",
  },
  {
    title: "Lavendel och lugn",
    tone: "Färgspår för framtida egna bilder",
    src: "https://images.unsplash.com/photo-1499002238440-d264edd596ec?auto=format&fit=crop&w=1400&q=80",
    credit: "Exempelbild från Unsplash",
  },
  {
    title: "Beröring och omsorg",
    tone: "Massage, vila och trygg takt",
    src: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80",
    credit: "Exempelbild från Unsplash",
  },
  {
    title: "Andning och närvaro",
    tone: "Kropp, rum och stilla fokus",
    src: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=80",
    credit: "Exempelbild från Unsplash",
  },
  {
    title: "Massage",
    tone: "Beröring, omsorg och lugn rytm",
    src: "/assets/generated/berattelser-massage.png",
    credit: "Eget arbete",
  },
  {
    title: "Meditation",
    tone: "Andning, stillhet och inre fokus",
    src: "/assets/generated/berattelser-meditation.png",
    credit: "Eget arbete",
  },
] as const;

export type CeremonyImage = (typeof ceremonyImages)[number];

export const berattelser = {
  sectionId: "berattelser",
  kicker: "Berättelser",
  introHeadingId: "stories-heading",
  h1: "Bildstämning och plats för godkända röster.",
  intro:
    "Här kan klientberättelser, egna bilder och stilla detaljer samlas längre fram. Just nu används sidan för riktning och struktur — utan påhittade omdömen.",
  gallery: {
    headingId: "gallery-heading",
    prelude: "Bildstämning",
    heading: "Exempelbilder för färg, ljus och närvaro.",
    note: "Horisontell scroll med mjuka stopp. Bilderna är webbilder som exempel på ton och känsla — inte bilder från Nastarans faktiska arbete ännu.",
  },
  storySlots: [
    ["01", "Godkända röster", "Inga klientomdömen är publicerade ännu. Här finns plats för riktiga röster när de är godkända."],
    ["02", "Stämning och bildspråk", "Sidan visar riktning för ljus, material och känsla tills Nastarans egna bilder finns."],
    ["03", "Egen bildbank", "Exempelbilderna är från webben och ska bytas mot Nastarans egna bilder när de finns."],
  ] as const,
  meta: {
    title: "Berättelser — Nastaran",
    description:
      "En förberedd sida för godkända klientröster och bildstämning kring healing, reiki och massage.",
  },
} as const;
