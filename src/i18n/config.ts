/**
 * The site's two languages. Hebrew is the default and lives at the root
 * (/shop/, /product/…/); English mirrors every page under /en/.
 */
export const LOCALES = ["he", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "he";

export const dirOf = (locale: Locale) => (locale === "he" ? "rtl" : "ltr");

/** A site path in a language: lp("en", "/shop/") → "/en/shop/"; Hebrew paths stay as they are. */
export function lp(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE || !path.startsWith("/")) return path;
  return path === "/" ? "/en/" : `/en${path}`;
}

/** The language of a site path (without the base path). */
export function localeOfPath(pathname: string): Locale {
  return /^\/en(\/|$)/.test(pathname) ? "en" : "he";
}

/** The same page in the other language: "/en/shop/" ↔ "/shop/". */
export function switchPath(pathname: string, to: Locale): string {
  const bare = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
  const withSlash = bare.endsWith("/") ? bare : `${bare}/`;
  return lp(to, withSlash);
}
