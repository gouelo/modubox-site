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
