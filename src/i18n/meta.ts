import type { Metadata } from "next";
import { lp, type Locale } from "./config";
import { dict } from "./index";

/**
 * The Open Graph defaults every page shares (site name and the share photo).
 * A page that sets its own openGraph replaces the layout's whole, so pageMeta
 * repeats these: without them a shared link had no picture.
 */
export function ogDefaults(locale: Locale) {
  const m = dict(locale).meta;
  return {
    type: "website" as const,
    locale: m.ogLocale,
    alternateLocale: locale === "he" ? "en_US" : "he_IL",
    siteName: m.siteName,
    images: [{ url: "/_img/photos/2c981b23-1600.webp", width: 1600, height: 900, alt: m.ogImageAlt }],
  };
}

/**
 * A page's metadata in a language, with its hreflang alternates: the same
 * page in Hebrew (the default, also x-default) and in English.
 */
export function pageMeta(locale: Locale, path: string, meta: Metadata = {}): Metadata {
  return {
    ...meta,
    alternates: {
      canonical: lp(locale, path),
      languages: { he: lp("he", path), en: lp("en", path), "x-default": lp("he", path) },
    },
    openGraph: { ...ogDefaults(locale), url: lp(locale, path), ...(meta.openGraph ?? {}) },
  };
}

/** The length search engines show of a meta description (the agency's report: 120–155 characters). */
export const DESCRIPTION_LENGTH = { min: 120, max: 155 };

/**
 * A meta description of a good length: the first candidate within 120–155
 * characters, else the longest that fits, else the first cut at a word with "…".
 */
export function fitDescription(candidates: string[], { min, max } = DESCRIPTION_LENGTH): string {
  const clean = candidates.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean);
  const inRange = clean.find((c) => c.length >= min && c.length <= max);
  if (inRange) return inRange;
  const fits = clean.filter((c) => c.length <= max).sort((a, b) => b.length - a.length)[0];
  if (fits) return fits;
  const first = clean[0] ?? "";
  const cut = first.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), min - 1)).replace(/[\s,:;–-]+$/, "")}…`;
}
