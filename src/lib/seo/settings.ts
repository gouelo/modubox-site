import { dict } from "@/i18n";
import type { Locale } from "@/i18n";
import { catalog, site } from "@/lib/catalog";

/**
 * The site-wide settings of the content module (table site_settings), with
 * their defaults from data/site.json. An empty field keeps the default.
 */

/** The business as search engines and AI assistants read it: the Organization / LocalBusiness JSON-LD. */
export interface Business {
  name: string;
  legalName: string;
  description: string;
  phone: string;
  email: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  /** "32.5546112,35.3945159" */
  geo: string;
  /** one line each, schema.org style: "Su-Th 08:00-17:00" */
  openingHours: string[];
  areaServed: string;
  priceRange: string;
  foundingYear: string;
  /** profiles: Facebook, Instagram, YouTube, Google Business… */
  sameAs: string[];
  rating: number;
  reviewCount: number;
}

export function defaultBusiness(locale: Locale = "he"): Business {
  const s = catalog(locale).site;
  return {
    name: dict(locale).meta.siteName,
    legalName: "",
    description: s.tagline,
    phone: s.phone,
    email: s.email,
    streetAddress: s.factory,
    city: "",
    postalCode: "",
    geo: "",
    openingHours: [],
    areaServed: "",
    priceRange: "",
    foundingYear: "",
    sameAs: Object.values(s.social),
    rating: s.rating,
    reviewCount: s.reviewCount,
  };
}

/** Saved in Hebrew: on the English pages only the fields that read the same in both. */
const TEXT_FIELDS: (keyof Business)[] = ["name", "description", "streetAddress", "city", "areaServed"];

const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : typeof v === "number" ? v > 0 : typeof v === "string" ? v.trim() !== "" : false);

/** The defaults with the saved fields on top. */
export function business(saved: Partial<Business>, locale: Locale = "he"): Business {
  const out = defaultBusiness(locale);
  for (const k of Object.keys(out) as (keyof Business)[]) {
    if (locale !== "he" && TEXT_FIELDS.includes(k)) continue;
    if (filled(saved[k])) (out as unknown as Record<string, unknown>)[k] = saved[k];
  }
  return out;
}

/** The site-wide JSON-LD, in every page (src/components/SiteShell.tsx). Without saved settings: as it always was. */
export function orgJsonLd(b: Business, locale: Locale): Record<string, unknown> {
  const [lat, lng] = b.geo.split(",").map((s) => Number(s.trim()));
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: b.name,
    ...(b.legalName ? { legalName: b.legalName } : {}),
    ...(b.description && b.description !== catalog(locale).site.tagline ? { description: b.description } : {}),
    url: site.url,
    telephone: b.phone,
    email: b.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.streetAddress,
      ...(b.city ? { addressLocality: b.city } : {}),
      ...(b.postalCode ? { postalCode: b.postalCode } : {}),
      addressCountry: "IL",
    },
    ...(Number.isFinite(lat) && Number.isFinite(lng) && b.geo ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng } } : {}),
    ...(b.openingHours.length ? { openingHours: b.openingHours } : {}),
    ...(b.areaServed ? { areaServed: b.areaServed } : {}),
    ...(b.priceRange ? { priceRange: b.priceRange } : {}),
    ...(b.foundingYear ? { foundingDate: b.foundingYear } : {}),
    aggregateRating: { "@type": "AggregateRating", ratingValue: b.rating, reviewCount: b.reviewCount },
    sameAs: b.sameAs,
  };
}

/** /llms.txt: the generated guide, with an opening and extra sections of the admin's own. */
export interface LlmsSettings {
  /** replaces the one-line summary under the title */
  intro: string;
  /** Markdown added at the end (## headings, - lists) */
  extra: string;
}

/** AI crawlers, by user agent: "block" keeps it off the whole site (robots.txt). Anything not here is allowed. */
export type AiCrawlers = Record<string, "allow" | "block">;

export const AI_CRAWLERS: { agent: string; owner: string; use: string }[] = [
  { agent: "GPTBot", owner: "OpenAI", use: "אימון מודלים" },
  { agent: "OAI-SearchBot", owner: "OpenAI", use: "חיפוש ב-ChatGPT" },
  { agent: "ChatGPT-User", owner: "OpenAI", use: "גלישה בשם משתמש" },
  { agent: "ClaudeBot", owner: "Anthropic", use: "אימון מודלים" },
  { agent: "Claude-SearchBot", owner: "Anthropic", use: "חיפוש ב-Claude" },
  { agent: "Claude-User", owner: "Anthropic", use: "גלישה בשם משתמש" },
  { agent: "PerplexityBot", owner: "Perplexity", use: "חיפוש" },
  { agent: "Perplexity-User", owner: "Perplexity", use: "גלישה בשם משתמש" },
  { agent: "Google-Extended", owner: "Google", use: "Gemini ואימון (לא משפיע על החיפוש)" },
  { agent: "Applebot-Extended", owner: "Apple", use: "אימון מודלים" },
  { agent: "meta-externalagent", owner: "Meta", use: "אימון מודלים" },
  { agent: "Amazonbot", owner: "Amazon", use: "Alexa ואימון" },
  { agent: "Bytespider", owner: "ByteDance", use: "אימון מודלים" },
  { agent: "CCBot", owner: "Common Crawl", use: "מאגר פתוח לאימון" },
];

export const blockedCrawlers = (c: AiCrawlers) => Object.entries(c).filter(([, v]) => v === "block").map(([k]) => k);
