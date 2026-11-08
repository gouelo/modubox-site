import type { Metadata } from "next";
import { dict, lp, type Locale } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { listPosts } from "@/lib/blog";
import { plain, products } from "@/lib/catalog";
import { categoryPages } from "@/lib/category-pages";
import { categoryMeta } from "@/views/CategoryPage";
import { aboutMeta } from "@/views/AboutPage";
import { blogIndexMeta, postMeta } from "@/views/BlogPages";
import { contactMeta } from "@/views/ContactPage";
import { faqMeta } from "@/views/FaqPage";
import { galleryMeta } from "@/views/GalleryPage";
import { productMeta } from "@/views/ProductPage";
import { shopMeta } from "@/views/ShopPage";
import { textMeta } from "@/views/TextPage";

/** Every public page the content module can edit, with its default metadata (what the code gives it). */
export interface SitePage {
  path: string;
  label: string;
  locale: Locale;
  kind: "page" | "product" | "post";
  meta: () => Metadata | Promise<Metadata>;
}

const PAGES: { path: string; label: string; meta: (l: Locale) => Metadata }[] = [
  { path: "/", label: "דף הבית", meta: (l) => pageMeta(l, "/") },
  { path: "/shop/", label: "קטלוג", meta: shopMeta },
  { path: "/gallery/", label: "גלריה", meta: galleryMeta },
  { path: "/faq/", label: "שאלות נפוצות", meta: faqMeta },
  { path: "/about/", label: "אודות", meta: aboutMeta },
  { path: "/contact/", label: "צור קשר", meta: contactMeta },
  { path: "/warranty/", label: "אחריות", meta: (l) => textMeta(l, "warranty") },
  { path: "/terms/", label: "תקנון", meta: (l) => textMeta(l, "terms") },
  { path: "/privacy/", label: "פרטיות", meta: (l) => textMeta(l, "privacy") },
  { path: "/accessibility/", label: "נגישות", meta: (l) => textMeta(l, "accessibility") },
];

export async function sitePages(): Promise<SitePage[]> {
  const out: SitePage[] = [];
  for (const locale of ["he", "en"] as const) {
    for (const p of PAGES) out.push({ path: lp(locale, p.path), label: p.label, locale, kind: "page", meta: () => p.meta(locale) });
    if (locale === "he") out.push({ path: "/blog/", label: "בלוג", locale, kind: "page", meta: blogIndexMeta });
    for (const c of categoryPages(locale)) out.push({ path: lp(locale, `/${c.slug}/`), label: c.label, locale, kind: "page", meta: () => categoryMeta(locale, c.slug) });
    for (const p of products) out.push({ path: lp(locale, `/product/${p.slug}/`), label: plain(p.name), locale, kind: "product", meta: () => productMeta(locale, p.slug) });
  }
  for (const p of await listPosts()) out.push({ path: `/blog/${p.slug}/`, label: p.title, locale: "he", kind: "post", meta: () => postMeta(p.slug) });
  return out;
}

export async function findSitePage(path: string): Promise<SitePage | undefined> {
  return (await sitePages()).find((p) => p.path === path);
}

/** The <title> a page's metadata gives, through the site's template ("… | מודובוקס Modubox"). */
export function renderedTitle(meta: Metadata, locale: Locale): string {
  const m = dict(locale).meta;
  const t = meta.title;
  if (!t) return m.defaultTitle;
  if (typeof t === "string") return m.titleTemplate.replace("%s", t);
  if ("absolute" in t && t.absolute) return t.absolute;
  if ("default" in t && t.default) return t.default;
  return m.defaultTitle;
}

export function renderedDescription(meta: Metadata, locale: Locale): string {
  return (typeof meta.description === "string" && meta.description) || dict(locale).meta.description;
}
