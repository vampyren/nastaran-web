// Swedish copy ported verbatim from old /kontakt page.tsx + ContactForm.

export const treatments = [
  "Första samtal / hitta rätt behandling",
  "Healing",
  "Reiki",
  "Massage",
  "Kombination av healing, reiki och massage",
  "Presentkort eller fråga åt någon annan",
  "Jag är osäker och vill gärna få vägledning",
] as const;

export const kontakt = {
  sectionId: "kontakt-sida",
  kicker: "Kontakt",
  heroHeadingId: "contact-heading",
  h1: "Så tar du kontakt.",
  intro:
    "Berätta kort vad du söker: healing, reiki, massage eller ett första samtal om vad som kan passa. Du behöver inte dela känsliga detaljer innan kontakten känns trygg.",
  email: {
    prelude: "E-post",
    cta: "Skicka e-post direkt",
    note: "Du kan också använda formuläret nedan om du vill få med behandling, meddelande och upp till tre önskade tider.",
  },
  form: {
    headingId: "form-heading",
    prelude: "Skriv till mig",
    heading: "Boka ett första lugnt steg.",
    body: "Välj behandling, skriv kort vad du söker och markera upp till tre tider som kan passa. Nastaran återkommer och bekräftar vilken tid som fungerar.",
  },
  nextSteps: {
    headingId: "next-steps-heading",
    prelude: "Nästa steg",
    heading: "Vad händer sen?",
    body: "När du har skickat din förfrågan återkommer Nastaran personligen till dig. Tiden bokas inte automatiskt — den bekräftas manuellt så att den passar er båda. Du behöver inte dela några känsliga detaljer i den första kontakten; berätta bara så mycket som känns tryggt för dig.",
  },
  flow: {
    headingId: "flow-heading",
    prelude: "Så kan du skriva",
    heading: "Kort, tydligt och utan press.",
    rows: [
      ["01", "Vilken behandling du är nyfiken på."],
      ["02", "Om du önskar ett lugnt första samtal eller vill fråga vad som kan passa."],
      ["03", "Vilka tider eller dagar som brukar fungera för dig, om du vill nämna det."],
    ] as const,
  },
  safe: {
    headingId: "safe-heading",
    heading: "Komplementärt välmående ersätter inte sjukvård.",
    body: "Vid sjukdom, skada, oro eller akuta symtom ska du kontakta legitimerad vårdpersonal eller akut hjälp.",
  },
  meta: {
    title: "Kontakt — Nastaran",
    description:
      "Kontaktväg för frågor om healing, reiki och massage med tydlig kompletterande friskvårdsram.",
  },
} as const;
