import type { Addon, Fulfillment, Product } from "./types";

/**
 * Catalog changes made in the admin (/admin/catalog), applied on top of
 * data/products.json and data/addons.json by src/lib/catalog.ts. Each patch
 * holds only what it changes; with none, the catalog is the files, exactly.
 */
export interface EnProductPatch {
  name?: string;
  shortDescription?: string;
  badge?: string;
}

export interface ProductPatch {
  name?: string;
  price?: number;
  badge?: string | null;
  shortDescription?: string;
  warrantyYears?: number;
  images?: string[];
  fulfillment?: Partial<Pick<Fulfillment, "pickup" | "delivery" | "installation" | "deliveryAndInstallation" | "payToInstaller" | "note">>;
  addons?: string[];
  addonPriceOverrides?: Record<string, number>;
  configurable?: boolean;
  /** off the site (its page, lists, the cart's pricing) */
  hidden?: boolean;
  en?: EnProductPatch;
  /** a new product: copied from this one, listed after it */
  copiedFrom?: string;
  /** a new product's own fields */
  sizeLabel?: string;
  widthM?: number;
  depthM?: number;
  areaM2?: number;
}

export interface AddonPatch {
  name?: string;
  description?: string;
  price?: number | null;
  pricePerM2?: number;
  maxQty?: number;
  /** by choice id */
  choices?: Record<string, { label?: string; price?: number | null }>;
  en?: { name?: string; description?: string };
}

export interface CatalogOverrides {
  generatedAt?: string | null;
  products: Record<string, ProductPatch>;
  addons: Record<string, AddonPatch>;
  /** the hidden 1 ₪ test product switched on or off in the admin (site_settings "test_product"); absent: data/test-product.json's own */
  testProduct?: { enabled: boolean };
  /** the site's texts and reviews edited in the admin (/admin/site: site_settings "site_texts", "promo", "faq", "reviews") */
  site?: SitePatch;
  promo?: PromoData;
  faq?: FaqPatch;
  reviews?: ReviewsPatch;
}

/** Business details shown across the site (data/site.json and data/en/site.json). An absent field keeps the file's. */
export interface SitePatch {
  phone?: string;
  phoneAlt?: string;
  whatsapp?: string;
  whatsappGreeting?: string;
  email?: string;
  factory?: string;
  factory2?: string;
  pickupLocation?: string;
  hours?: string;
  rating?: number;
  reviewCount?: number;
  floatingConfiguratorCta?: boolean;
  en?: { whatsappGreeting?: string; factory?: string; factory2?: string; pickupLocation?: string; hours?: string };
}

/** The month's promotion banner: data/promo.json, whole. */
export interface PromoData {
  enabled: boolean;
  eyebrow: string;
  title: string;
  text: string;
  endDate: string;
  cta: { label: string; href: string; whatsappText?: string };
  en: { enabled: boolean; eyebrow: string; title: string; text: string; ctaLabel: string; whatsappText?: string };
}

/**
 * The FAQ page's questions, per group (by its id in data/faq.json), in the
 * admin's order. `from` is the question's place in the file: it keeps the
 * file's link, photos and English unless the row sets its own. A row without
 * `from` is a new question.
 */
export interface FaqPatch {
  groups: Record<string, { title?: string; enTitle?: string; items: FaqRow[] }>;
}
export interface FaqRow {
  from?: number;
  q: string;
  a: string;
  en?: { q?: string; a?: string };
  hidden?: boolean;
}

/** The Google reviews shown on the site, whole and in order (data/reviews.json and data/en/reviews.json). */
export interface ReviewsPatch {
  reviews: ReviewRow[];
}
export interface ReviewRow {
  name: string;
  date: string;
  rating: number;
  text: string;
  en?: { name?: string; text?: string };
  hidden?: boolean;
}

const SITE_TEXT_FIELDS = ["phone", "phoneAlt", "whatsapp", "whatsappGreeting", "email", "factory", "factory2", "pickupLocation", "hours", "rating", "reviewCount", "floatingConfiguratorCta"] as const;

/** data/site.json with the admin's changes, in a language (`localized` is the file's own words in that language). */
export function applySitePatch<T extends Record<string, unknown>>(localized: T, patch: SitePatch | undefined, locale: "he" | "en"): T {
  if (!patch) return localized;
  const out: Record<string, unknown> = { ...localized };
  for (const k of SITE_TEXT_FIELDS) {
    const v = patch[k];
    if (v === undefined || v === "") continue;
    // the words have an English version; numbers and the switch are the same in both
    if (locale === "en" && ["whatsappGreeting", "factory", "factory2", "pickupLocation", "hours"].includes(k)) continue;
    out[k] = v;
  }
  if (locale === "en" && patch.en) for (const [k, v] of Object.entries(patch.en)) if (v) out[k] = v;
  return out as T;
}

interface FaqItemLike {
  q: string;
  a: string;
}
interface FaqGroupLike<I extends FaqItemLike> {
  id: string;
  title: string;
  items: I[];
}

/**
 * The FAQ groups with the admin's rows. `he` and `en` are the same groups in
 * both languages, item for item (the English is the file's translation).
 */
export function applyFaqPatch<I extends FaqItemLike, G extends FaqGroupLike<I>>(groups: G[], patch: FaqPatch | undefined, locale: "he" | "en"): G[] {
  if (!patch) return groups;
  return groups.map((g) => {
    const p = patch.groups[g.id];
    if (!p) return g;
    const title = locale === "en" ? p.enTitle || g.title : p.title || g.title;
    const items = p.items
      .filter((r) => !r.hidden && (r.from === undefined || g.items[r.from]))
      .map((r): I => {
        const base = r.from === undefined ? undefined : g.items[r.from];
        const words = locale === "en" ? { q: r.en?.q || (r.from === undefined ? r.q : base!.q), a: r.en?.a || (r.from === undefined ? r.a : base!.a) } : { q: r.q || base?.q || "", a: r.a || base?.a || "" };
        return { ...(base ?? ({} as I)), ...words };
      });
    return { ...g, title, items };
  });
}

/** The reviews in the admin's order, without the hidden ones, in a language. */
export function applyReviewsPatch<R extends { name: string; text: string; date: string; rating: number }>(base: R[], patch: ReviewsPatch | undefined, locale: "he" | "en"): R[] {
  if (!patch) return base;
  return patch.reviews
    // on the English site, a review without an English text is left out
    .filter((r) => !r.hidden && r.text.trim() && (locale === "he" || !!r.en?.text?.trim()))
    .map((r) => ({ name: (locale === "en" && r.en?.name) || r.name, text: (locale === "en" && r.en?.text) || r.text, date: r.date, rating: r.rating }) as R);
}

export const NO_OVERRIDES: CatalogOverrides = { products: {}, addons: {} };

const PRODUCT_FIELDS = ["name", "price", "badge", "shortDescription", "warrantyYears", "images", "addons", "addonPriceOverrides", "configurable", "sizeLabel", "widthM", "depthM", "areaM2"] as const;

function patchProduct(p: Product, patch: ProductPatch, slug = p.slug): Product {
  const out: Product = { ...p, slug };
  for (const k of PRODUCT_FIELDS) if (patch[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = patch[k];
  if (patch.fulfillment) out.fulfillment = { ...p.fulfillment, ...patch.fulfillment };
  if (patch.copiedFrom) {
    // a copy is a product of its own: no old address, no to-do of the original
    delete out.oldUrl;
    delete out.todo;
  }
  return out;
}

/** The products with the changes on top: patched, hidden ones out, new ones after the product they were copied from. */
export function applyProductOverrides(base: Product[], o: CatalogOverrides): Product[] {
  const out: Product[] = [];
  const added = Object.entries(o.products).filter(([slug, p]) => p.copiedFrom && !base.some((b) => b.slug === slug));
  for (const b of base) {
    const patch = o.products[b.slug];
    if (!patch?.hidden) out.push(patch ? patchProduct(b, patch) : b);
    for (const [slug, p] of added) if (p.copiedFrom === b.slug && !p.hidden) out.push(patchProduct(b, p, slug));
  }
  return out;
}

export function applyAddonOverrides(base: Addon[], o: CatalogOverrides): Addon[] {
  return base.map((a) => {
    const patch = o.addons[a.id];
    if (!patch) return a;
    const out: Addon = { ...a };
    if (patch.name !== undefined) out.name = patch.name;
    if (patch.description !== undefined) out.description = patch.description;
    if (patch.price !== undefined) out.price = patch.price;
    if (patch.pricePerM2 !== undefined) out.pricePerM2 = patch.pricePerM2;
    if (patch.maxQty !== undefined) out.maxQty = patch.maxQty;
    if (patch.choices && a.choices) out.choices = a.choices.map((c) => ({ ...c, ...(patch.choices![c.id] ?? {}) }));
    return out;
  });
}

/** English texts from the patches, over data/en (by product slug / add-on id). */
export function enProductTexts<T extends object>(base: Record<string, T>, o: CatalogOverrides): Record<string, T & EnProductPatch> {
  const out: Record<string, T & EnProductPatch> = { ...base } as Record<string, T & EnProductPatch>;
  for (const [slug, p] of Object.entries(o.products)) {
    const from = p.copiedFrom && !base[slug] ? base[p.copiedFrom] : base[slug];
    if (p.en || (p.copiedFrom && from)) out[slug] = { ...(from ?? ({} as T)), ...(p.en ?? {}) };
  }
  return out;
}

export function enAddonTexts<T extends { name: string; description?: string }>(base: Record<string, T>, o: CatalogOverrides): Record<string, T> {
  const out = { ...base };
  for (const [id, a] of Object.entries(o.addons)) if (a.en && base[id]) out[id] = { ...base[id], ...a.en, name: a.en.name || base[id].name };
  return out;
}
