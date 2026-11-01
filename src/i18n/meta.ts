import type { Metadata } from "next";
import { lp, type Locale } from "./config";
import { dict } from "./index";

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
    openGraph: { locale: dict(locale).meta.ogLocale, url: lp(locale, path), ...(meta.openGraph ?? {}) },
  };
}
