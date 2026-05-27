import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import AdminFAB from "@/components/AdminFAB";
import BodyBackground from "@/components/BodyBackground";
import HeaderFrost from "@/components/HeaderFrost";
import ThemeBootScript from "@/components/theme/ThemeBootScript";
import ThemeDecorations from "@/components/theme/ThemeDecorations";
import ThemeSwitcher from "@/components/theme/ThemeSwitcher";
import { siteMeta } from "@/content/site";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: siteMeta.title,
  description: siteMeta.description,
  applicationName: siteMeta.applicationName,
  authors: [{ name: siteMeta.authorName }],
  openGraph: {
    title: siteMeta.title,
    description: siteMeta.description,
    locale: siteMeta.locale,
    siteName: siteMeta.applicationName,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteMeta.title,
    description: siteMeta.description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: siteMeta.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv" className={`${inter.variable} ${newsreader.variable}`}>
      <head>
        <ThemeBootScript />
      </head>
      <body>
        <BodyBackground />
        <ThemeDecorations />
        <HeaderFrost />
        {/* Global top safe-area for the fixed floating nav pill.
            All routes get this padding so content starts below the pill.

            `flex min-h-screen flex-col` sets up the sticky-footer
            pattern: pages whose <main> uses `flex-1` will grow to
            fill the viewport so the SiteFooter sits at the bottom
            on short pages (admin / admin-login / onskemal /
            onskemal-kogen have minimal content; without this they'd
            render the footer mid-viewport). Public pages that
            don't add `flex-1` to main are unaffected — they already
            have enough content to fill the viewport. */}
        <div className="flex min-h-screen flex-col pt-[96px] lg:pt-[112px]">
          {children}
        </div>
        <ThemeSwitcher />
        {/* AdminFAB renders only for logged-in admins (probes /api/admin/me
            on mount). Anonymous visitors never see it — see
            spec/pipeline-mvp.md § Routes and AdminFAB itself. */}
        <AdminFAB />
      </body>
    </html>
  );
}
