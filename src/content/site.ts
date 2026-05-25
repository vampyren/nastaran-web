export type NavItem = {
  number: string;
  label: string;
  href: string;
};

export const navItems: readonly NavItem[] = [
  { number: "01", label: "Hem", href: "/" },
  { number: "02", label: "Behandlingar", href: "/#behandlingar" },
  { number: "03", label: "Om mig", href: "/om-mig" },
  { number: "04", label: "Berättelser", href: "/berattelser" },
  { number: "05", label: "Kontakt", href: "/kontakt" },
] as const;

export const contactEmail = "kontakt@drnastaran.se";

export const siteMeta = {
  title: "Nastaran — Healing, reiki & massage",
  description:
    "Svensk först-sida för Nastarans arbete med healing, reiki och massage — en varm, professionell och tydlig presentation av komplementärt välmående.",
  applicationName: "Nastaran",
  authorName: "Nastaran",
  locale: "sv_SE",
  themeColor: "#faf7fc",
} as const;
