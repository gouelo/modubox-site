import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import type { ReactNode } from "react";
import { dict, dirOf, type Locale } from "@/i18n";
import { LocaleProvider } from "@/i18n/client";
import { ogDefaults } from "@/i18n/meta";
import { site } from "@/lib/catalog";
import { asset } from "@/lib/paths";
import { GOOGLE_SITE_VERIFICATION, gtmHosts, gtmId } from "@/lib/analytics";
import { GoogleTagManager } from "./Analytics";
import { ConfiguratorPanel } from "./ConfiguratorPanel";
import { FloatingConfiguratorCta } from "./FloatingConfiguratorCta";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { WhatsAppFab } from "./WhatsAppFab";
import { LeadAttribution } from "./LeadAttribution";
import { CallFab } from "./CallFab";
import { CookieConsent } from "./CookieConsent";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo", display: "swap" });

export function rootMetadata(locale: Locale): Metadata {
  const m = dict(locale).meta;
  return {
    metadataBase: new URL(site.url),
    title: { default: m.defaultTitle, template: m.titleTemplate },
    description: m.description,
    keywords: m.keywords,
    openGraph: ogDefaults(locale),
    icons: { icon: asset("/brand/favicon.svg"), apple: asset("/brand/apple-touch-icon.png") },
    formatDetection: { telephone: false },
    verification: { google: GOOGLE_SITE_VERIFICATION },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a1517",
  width: "device-width",
  initialScale: 1,
};

/** The <html> of every page, in one language: lang and dir, header, footer and the site-wide pieces. */
export function SiteShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = dict(locale);
  // Google Tag Manager: production, on the real domain only (src/lib/analytics.ts)
  const gtm = gtmId();
  return (
    <html lang={locale} dir={dirOf(locale)} className={heebo.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <LocaleProvider locale={locale}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[80] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
            {t.common.skip}
          </a>
          <Header />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer locale={locale} />
          <WhatsAppFab />
          <CallFab />
          {/* experiment: a floating shed inviting people to the 3D configurator (site.json → floatingConfiguratorCta) */}
          <FloatingConfiguratorCta />
          {/* the 3D configurator: opens links to it in a side panel, with "add to cart" */}
          <ConfiguratorPanel />
          {/* cookie consent (Google Consent Mode v2) */}
          <CookieConsent />
          {/* UTM tags and ad click ids for the lead forms */}
          <LeadAttribution />
        </LocaleProvider>
        {gtm && <GoogleTagManager id={gtm} hosts={gtmHosts(process.env, site.url)} />}
      </body>
    </html>
  );
}
