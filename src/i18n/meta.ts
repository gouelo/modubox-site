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
