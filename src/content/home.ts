// All Swedish copy on this file is ported verbatim from the old project's
// src/app/page.tsx. Do not edit by hand — see spec/decisions-and-open-questions.md
// §D for the copy-drift rule.

export const home = {
  hero: {
    sectionId: "hem",
    headingId: "hem-heading",
    prelude: "Healing · Reiki · Massage",
    h1: "Nastaran",
    intro: "En varm plats för stillhet, beröring och återhämtning.",
    body: "Ett lugnt svenskt möte där lavendel, sandelträstoner och varsamma ritualer får ge form åt stillheten — utan överlöften.",
    cta: { href: "/kontakt", label: "Kontakta Nastaran" },
    ritualCaption: "Sandelträ · stillhet · omsorg",
    image: {
      src: "/assets/generated/nastaran_space.jpeg",
      alt: "",
    },
    facts: [
      ["Fokus", "Närvaro och återhämtning"],
      ["Behandlingar", "Healing · Reiki · Massage"],
      ["Ram", "Komplementärt välmående"],
    ] as const,
  },
  treatments: {
    sectionId: "behandlingar",
    headingId: "behandlingar-heading",
    numeral: "02",
    index: "02 / Behandlingar",
    label: "Behandlingar",
    heading: "Tre vägar in i samma lugna rum.",
    pullQuote: "Varsamt, närvarande och utan överlöften.",
    body: "Behandlingarna beskrivs enkelt och sakligt. Det viktigaste är ett lugnt möte där du får känna in vad som passar.",
    rows: [
      ["01", "Healing", "Ett stilla rum för närvaro, mjuk balans och personlig återhämtning."],
      ["02", "Reiki", "Varsam energibehandling med respekt för kroppens egen takt."],
      ["03", "Massage", "Lugn kroppsterapeutisk beröring med fokus på avspänning och omsorg."],
    ] as const,
  },
  rhythm: {
    sectionId: "rytm",
    headingId: "rytm-heading",
    prelude: "03 / Rytm",
    heading: "En mjukare rytm genom dagen.",
    words: ["Stillhet", "Beröring", "Återhämtning"] as const,
    wordsAriaLabel: "Stillhet, beröring och återhämtning",
    body: "Tre rörelser i samma rum: att stanna upp, ta emot och låta efterklang få plats.",
  },
  preparation: {
    sectionId: "infor-besok",
    headingId: "infor-besok-heading",
    numeral: "04",
    index: "04 / Inför besök",
    label: "Inför besök",
    heading: "En första kontakt utan press.",
    body: "Du kan börja kort och enkelt. Det viktigaste är att kontakten känns respektfull, tydlig och i rätt takt för dig.",
    rows: [
      ["01", "Börja enkelt", "Skriv kort vad du söker och vilken typ av behandling du är nyfiken på."],
      ["02", "Hitta rätt takt", "Du behöver inte dela känsliga detaljer innan kontakten känns trygg."],
      ["03", "Tydliga gränser", "Behandlingarna är komplementärt stöd och ersätter inte sjukvård."],
    ] as const,
  },
  information: {
    sectionId: "praktisk-information",
    headingId: "praktisk-information-heading",
    numeral: "05",
    index: "05 / Praktisk information",
    label: "Praktiskt",
    heading: "Tydligt, varsamt och utan medicinska anspråk.",
    body: "Nastaran presenteras som komplementärt stöd för välmående. Vid sjukdom, skada eller oro ska du alltid vända dig till legitimerad vårdpersonal.",
    rows: [
      ["Inriktning", "Healing, reiki och massage med lugn, personlig närvaro."],
      ["Språk", "Svenska först."],
      ["Viktigt", "Vid medicinska besvär, oro eller akuta symtom ska du kontakta vården."],
    ] as const,
    importantLabel: "Viktigt",
  },
  contactTeaser: {
    sectionId: "kontakt",
    headingId: "kontakt-heading",
    numeral: "06",
    label: "Kontakt",
    prelude: "Nästa steg",
    heading: "En lugn kontaktväg, utan press.",
    body: "Kontaktsidan samlar hur du kan skriva, vad som är bra att nämna och den viktiga gränsen: komplementärt välmående ersätter inte sjukvård.",
    cta: { href: "/kontakt", label: "Öppna kontaktsidan" },
  },
} as const;
