import pagesFile from "../../data/categories.json";
import pagesEn from "../../data/en/categories.json";
import { lp, type Locale } from "@/i18n/config";
import { catalog } from "./catalog";
import type { Addon, Category, Product } from "./types";

/**
 * The landing pages by kind of shed (data/categories.json): on the old Wix
 * site's own addresses (/everest/, /garden-sheds/…), so the searches they rank
 * for keep landing on a page about them. Low-key on purpose (Yoel, 2026-11-08):
 * linked only from the footer's small links row and the sitemap, never from the
 * menu, home, catalog or product pages, since they show the same sheds.
 */
export interface CategoryPageSection {
  title: string;
  text: string[];
}
export interface CategoryPage {
  slug: string;
  /** what the grid shows: a product category, or the add-ons */
  products: Category | "addons";
  label: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  gridTitle: string;
  sections: CategoryPageSection[];
  faq: { q: string; a: string }[];
}

type Overlay = Partial<Omit<CategoryPage, "slug" | "products">>;
const he = pagesFile.pages as CategoryPage[];
const en = pagesEn.pages as Record<string, Overlay>;

/** The models the old site called "מחסן מודובוקס אוורסט": their titles carry "אוורסט" again. */
export const everestModels = new Set<string>(pagesFile.everestModels);

export const categorySlugs = he.map((p) => p.slug);

export function categoryPages(locale: Locale = "he"): CategoryPage[] {
  return he.map((p) => (locale === "he" ? p : { ...p, ...en[p.slug] }));
}

export function getCategoryPage(slug: string, locale: Locale = "he"): CategoryPage | undefined {
  return categoryPages(locale).find((p) => p.slug === slug);
}

/** "/everest/", "/en/everest/" (the Hebrew slug as it is: Link and the sitemap encode it). */
export function categoryPath(slug: string, locale: Locale = "he"): string {
  return lp(locale, `/${slug}/`);
}

/** The sheds a page shows (none for the add-ons page). */
export function categoryProducts(page: CategoryPage, locale: Locale = "he"): Product[] {
  if (page.products === "addons") return [];
  return catalog(locale).products.filter((p) => p.category === page.products);
}

/** The add-ons the accessories page shows: every one a shed can take, but the frame colour (no extra charge). */
export function accessoryAddons(locale: Locale = "he"): Addon[] {
  return catalog(locale).addons.filter((a) => a.id !== "profile-color");
}

/** An add-on's price as a list shows it: its price, or the lowest priced choice ("from"), or per m². */
export function addonListPrice(a: Addon): { kind: "fixed" | "from" | "perM2"; amount: number } | null {
  if (a.pricePerM2) return { kind: "perM2", amount: a.pricePerM2 };
  if (typeof a.price === "number" && a.price > 0) return { kind: "fixed", amount: a.price };
  const prices = (a.choices ?? []).map((c) => c.price).filter((p): p is number => typeof p === "number" && p > 0);
  return prices.length ? { kind: "from", amount: Math.min(...prices) } : null;
}
