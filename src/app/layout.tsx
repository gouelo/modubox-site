import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import Script from "next/script";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { site } from "@/lib/catalog";
import { asset } from "@/lib/paths";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "מודובוקס – מחסני גינה מפנל מבודד ויחידות חצר | Modubox",
    template: "%s | מודובוקס Modubox",
  },
  description:
    "מחסני גינה, משרדים ויחידות חצר מפנל מבודד ושלדת אלומיניום. 10 שנות אחריות, התקנה עד 21 ימי עסקים, עד 12 תשלומים. עצבו את המחסן שלכם ב־3D.",
  keywords: ["מחסן גינה", "מחסן פנל מבודד", "יחידת חצר", "מחסן מודולרי", "מודובוקס", "מחסני אוורסט", "משרד בחצר"],
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "מודובוקס Modubox",
    images: [{ url: "/_img/photos/2c981b23-1600.webp", width: 1600, height: 900, alt: "יחידת חצר מודובוקס עם קיר ויטרינה" }],
  },
  icons: { icon: asset("/brand/favicon.svg"), apple: asset("/brand/apple-touch-icon.png") },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a1517",
  width: "device-width",
  initialScale: 1,
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "HomeAndConstructionBusiness",
  name: "מודובוקס Modubox",
  url: site.url,
  telephone: site.phone,
  email: site.email,
  address: { "@type": "PostalAddress", streetAddress: site.factory, addressCountry: "IL" },
  aggregateRating: { "@type": "AggregateRating", ratingValue: site.rating, reviewCount: site.reviewCount },
  sameAs: Object.values(site.social),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          דילוג לתוכן
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <WhatsAppFab />
        {/* the 3D configurator: opens links to it in a side panel (see Design3DButton) */}
        {site.design3d.url && site.design3d.script && <Script src={site.design3d.script} data-market={site.design3d.market} strategy="lazyOnload" />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </body>
    </html>
  );
}
