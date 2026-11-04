import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { dict, type Locale } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { catalog } from "@/lib/catalog";
import { Markdown } from "@/lib/markdown";
import { waLink } from "@/lib/whatsapp";

/** The text pages, each a Markdown file: content/<page>.md in Hebrew, content/en/<page>.md in English. */
export type TextPageName = "terms" | "warranty" | "accessibility" | "privacy";

export const textMeta = (locale: Locale, page: TextPageName): Metadata => pageMeta(locale, `/${page}/`, dict(locale).meta[page]);

/** "1.11.2026" in Hebrew, "1 November 2026" in English */
function longDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (locale === "he") return `${d}.${m}.${y}`;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** When the privacy policy last changed (content/privacy.md). */
const PRIVACY_UPDATED = "2026-11-04";

/** The values a page's {{placeholders}} take (the accessibility statement's contact details). */
function vars(locale: Locale): Record<string, string> {
  const { site } = catalog(locale);
  const a = site.accessibility;
  const name = locale === "he" ? a.coordinator : a.coordinatorEn;
  return {
    phone: site.phone,
    email: site.email,
    whatsappLink: waLink(site.whatsappGreeting),
    // until Yoel names the coordinator, the role alone
    coordinator: name.startsWith("TODO") ? dict(locale).accessibility.coordinatorRole : name,
    updated: longDate(a.updated, locale),
    privacyUpdated: longDate(PRIVACY_UPDATED, locale),
  };
}

export function TextPage({ locale, page }: { locale: Locale; page: TextPageName }) {
  const source = fs.readFileSync(path.join(process.cwd(), "content", locale === "he" ? "" : locale, `${page}.md`), "utf8");
  return (
    <div className="container-x max-w-3xl py-14">
      <Markdown source={source} locale={locale} vars={vars(locale)} />
    </div>
  );
}
