import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import type { ReactNode } from "react";
import { dict, dirOf, type Locale } from "@/i18n";
import { LocaleProvider } from "@/i18n/client";
import { catalog, site } from "@/lib/catalog";
import { asset } from "@/lib/paths";
import { gtmId } from "@/lib/analytics";
import { GoogleTagManager, GoogleTagManagerNoScript } from "./Analytics";
import { ConfiguratorPanel } from "./ConfiguratorPanel";
import { FloatingConfiguratorCta } from "./FloatingConfiguratorCta";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { WhatsAppFab } from "./WhatsAppFab";
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
    openGraph: {
      type: "website",
      locale: m.ogLocale,
      alternateLocale: locale === "he" ? "en_US" : "he_IL",
      siteName: m.siteName,
      images: [{ url: "/_img/photos/2c981b23-1600.webp", width: 1600, height: 900, alt: m.ogImageAlt }],
    },
    icons: { icon: asset("/brand/favicon.svg"), apple: asset("/brand/apple-touch-icon.png") },
    formatDetection: { telephone: false },
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
  const s = catalog(locale).site;
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: t.meta.siteName,
    url: site.url,
    telephone: s.phone,
    email: s.email,
    address: { "@type": "PostalAddress", streetAddress: s.factory, addressCountry: "IL" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.reviewCount },
    sameAs: Object.values(s.social),
  };
  // Google Tag Manager: production only (src/lib/analytics.ts)
  const gtm = gtmId();
  return (
    <html lang={locale} dir={dirOf(locale)} className={heebo.variable}>
      <body className="min-h-dvh font-sans antialiased">
        {gtm && <GoogleTagManagerNoScript id={gtm} />}
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
        </LocaleProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        {gtm && <GoogleTagManager id={gtm} />}
      </body>
    </html>
  );
}
