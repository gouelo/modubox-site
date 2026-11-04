import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { catalogAddons, catalogProducts, type CatalogAddonRow, type CatalogProductRow } from "@/db/schema";
import addonsFile from "../../../data/addons.json";
import overridesFile from "../../../data/catalog-overrides.json";
import productsFile from "../../../data/products.json";
import addonsEn from "../../../data/en/addons.json";
import productsEn from "../../../data/en/products.json";
import { applyAddonOverrides, applyProductOverrides, type AddonPatch, type CatalogOverrides, type ProductPatch } from "../catalog-overrides";
import type { Addon, Product } from "../types";

/**
 * Catalog editing for the admin: drafts in the database, published in one go,
 * live after the next build (scripts/catalog-sync.mjs bakes the published
 * changes in; publishCatalog triggers that build with Vercel's deploy hook).
 */

export const fileProducts = () => productsFile.products as unknown as Product[];
export const fileAddons = () => addonsFile.addons as unknown as Addon[];
/** What the running site was built with. */
export const fileEnProduct = (slug: string) => ((productsEn.products as Record<string, { name?: string; shortDescription?: string; badge?: string }>)[slug] ?? {});
export const fileEnAddon = (id: string) => ((addonsEn.addons as Record<string, { name?: string; description?: string }>)[id] ?? {});
export const liveOverrides = () => overridesFile as unknown as CatalogOverrides;

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const strip = ({ copiedFrom: _c, ...rest }: ProductPatch) => rest;

export interface CatalogRows {
  products: CatalogProductRow[];
  addons: CatalogAddonRow[];
}

export async function catalogRows(db: Db): Promise<CatalogRows> {
  const [products, addons] = await Promise.all([db.select().from(catalogProducts), db.select().from(catalogAddons)]);
  return { products, addons };
}

/** The overrides a set of rows gives: their drafts (the admin's view) or what is published. */
export function overridesOf(rows: CatalogRows, which: "draft" | "published"): CatalogOverrides {
  const products: Record<string, ProductPatch> = {};
  for (const r of rows.products) {
    const p = r[which];
    if (p) products[r.slug] = { ...(p as ProductPatch), ...(r.copiedFrom ? { copiedFrom: r.copiedFrom } : {}) };
  }
  const addons: Record<string, AddonPatch> = {};
  for (const r of rows.addons) if (r[which]) addons[r.id] = r[which] as AddonPatch;
  return { products, addons };
}

/** The Hebrew catalog with a set of overrides (hidden products included, marked). */
export function productsWith(o: CatalogOverrides): (Product & { hidden?: boolean; copiedFrom?: string })[] {
  const shown = applyProductOverrides(fileProducts(), { ...o, products: Object.fromEntries(Object.entries(o.products).map(([k, v]) => [k, { ...v, hidden: false }])) });
  return shown.map((p) => ({ ...p, ...(o.products[p.slug]?.hidden ? { hidden: true } : {}), ...(o.products[p.slug]?.copiedFrom ? { copiedFrom: o.products[p.slug].copiedFrom } : {}) }));
}

export const addonsWith = (o: CatalogOverrides) => applyAddonOverrides(fileAddons(), o);

export type ChangeState = "draft" | "publishing" | null;

/** A product's or add-on's change state: an unpublished draft, published but not yet built, or live as it is. */
export function changeState(draft: unknown, published: unknown, live: unknown): ChangeState {
  if (!same(draft ?? {}, published ?? {})) return "draft";
  if (!same(published ?? {}, live ?? {})) return "publishing";
  return null;
}

const int = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const MAX_PRICE = 1_000_000;

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Saves a product's draft: the full set of editable fields as the form sent
 * them, kept as only what differs from data/products.json (for a new product:
 * from the product it was copied from).
 */
export async function saveProductDraft(db: Db, slug: string, wanted: ProductPatch): Promise<SaveResult> {
  const [row] = await db.select().from(catalogProducts).where(eq(catalogProducts.slug, slug));
  const base = fileProducts().find((p) => p.slug === (row?.copiedFrom ?? slug));
  if (!base) return { ok: false, error: "המוצר לא נמצא." };
  if (wanted.price !== undefined && !int(wanted.price, 1, MAX_PRICE)) return { ok: false, error: "מחיר לא תקין: מספר שלם בשקלים." };
  if (wanted.warrantyYears !== undefined && !int(wanted.warrantyYears, 0, 50)) return { ok: false, error: "שנות אחריות לא תקינות." };
  if (wanted.name !== undefined && !wanted.name.trim()) return { ok: false, error: "חסר שם." };
  if (wanted.images && wanted.images.length === 0) return { ok: false, error: "צריך לפחות תמונה אחת." };
  for (const [k, v] of Object.entries(wanted.fulfillment ?? {})) {
    if (k === "payToInstaller" || k === "note") continue;
    if (v !== null && !int(v, 0, MAX_PRICE)) return { ok: false, error: "מחיר הובלה/התקנה לא תקין." };
  }
  for (const v of Object.values(wanted.addonPriceOverrides ?? {})) if (!int(v, 0, MAX_PRICE)) return { ok: false, error: "מחיר תוספת לא תקין." };
  const known = new Set(fileAddons().map((a) => a.id));
  if (wanted.addons?.some((a) => !known.has(a))) return { ok: false, error: "תוספת לא מוכרת." };

  // the add-ons in the product's own order, new ones after
  if (wanted.addons) wanted = { ...wanted, addons: [...base.addons.filter((a) => wanted.addons!.includes(a)), ...wanted.addons.filter((a) => !base.addons.includes(a))] };
  const patch: ProductPatch = {};
  const b = base as unknown as Record<string, unknown>;
  for (const k of ["name", "price", "badge", "shortDescription", "warrantyYears", "images", "addons", "addonPriceOverrides", "configurable", "sizeLabel", "widthM", "depthM", "areaM2"] as const) {
    if (wanted[k] !== undefined && (row?.copiedFrom ? true : !same(wanted[k], b[k]))) (patch as Record<string, unknown>)[k] = wanted[k];
  }
  if (wanted.fulfillment) {
    const f: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(wanted.fulfillment)) if (!same(v ?? (k === "payToInstaller" ? false : null), (base.fulfillment as unknown as Record<string, unknown>)[k] ?? (k === "payToInstaller" ? false : null))) f[k] = v;
    if (Object.keys(f).length) patch.fulfillment = f;
  }
  if (wanted.en) {
    const fileEn = fileEnProduct(row?.copiedFrom ? "" : slug) as Record<string, string | undefined>;
    const en = Object.fromEntries(Object.entries(wanted.en).filter(([k, v]) => v && v !== fileEn[k]));
    if (Object.keys(en).length) patch.en = en;
  }
  if (wanted.hidden) patch.hidden = true;

  if (!row) {
    if (Object.keys(patch).length) await db.insert(catalogProducts).values({ slug, draft: patch as Record<string, unknown> });
  } else {
    if (!row.copiedFrom && !Object.keys(patch).length && !row.published) await db.delete(catalogProducts).where(eq(catalogProducts.slug, slug));
    else await db.update(catalogProducts).set({ draft: patch as Record<string, unknown>, updatedAt: new Date() }).where(eq(catalogProducts.slug, slug));
  }
  return { ok: true };
}

/** A new product, a copy of an existing one under a new address (a draft until published). */
export async function copyProduct(db: Db, from: string, slug: string, name: string): Promise<SaveResult> {
  const base = fileProducts().find((p) => p.slug === from);
  if (!base) return { ok: false, error: "המוצר לא נמצא." };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { ok: false, error: "הכתובת: אותיות באנגלית, ספרות ומקפים (למשל modubox-6x3)." };
  const taken = fileProducts().some((p) => p.slug === slug) || (await db.select({ s: catalogProducts.slug }).from(catalogProducts).where(eq(catalogProducts.slug, slug))).length > 0;
  if (taken) return { ok: false, error: "כבר יש מוצר בכתובת הזו." };
  const draft: ProductPatch = { name: name.trim() || base.name, price: base.price, images: base.images };
  await db.insert(catalogProducts).values({ slug, copiedFrom: from, draft: draft as Record<string, unknown> });
  return { ok: true };
}

export async function saveAddonDraft(db: Db, id: string, wanted: AddonPatch): Promise<SaveResult> {
  const base = fileAddons().find((a) => a.id === id);
  if (!base) return { ok: false, error: "התוספת לא נמצאה." };
  if (wanted.price !== undefined && wanted.price !== null && !int(wanted.price, 0, MAX_PRICE)) return { ok: false, error: "מחיר לא תקין." };
  if (wanted.pricePerM2 !== undefined && !int(wanted.pricePerM2, 0, MAX_PRICE)) return { ok: false, error: "מחיר למ\"ר לא תקין." };
  if (wanted.maxQty !== undefined && !int(wanted.maxQty, 1, 20)) return { ok: false, error: "כמות מקסימלית לא תקינה." };
  for (const c of Object.values(wanted.choices ?? {})) if (c.price !== undefined && c.price !== null && !int(c.price, 0, MAX_PRICE)) return { ok: false, error: "מחיר אפשרות לא תקין." };
  const patch: AddonPatch = {};
  if (wanted.name !== undefined && wanted.name.trim() && wanted.name !== base.name) patch.name = wanted.name.trim();
  if (wanted.description !== undefined && wanted.description !== (base.description ?? "")) patch.description = wanted.description;
  if (wanted.price !== undefined && !same(wanted.price, base.price)) patch.price = wanted.price;
  if (wanted.pricePerM2 !== undefined && wanted.pricePerM2 !== base.pricePerM2) patch.pricePerM2 = wanted.pricePerM2;
  if (wanted.maxQty !== undefined && wanted.maxQty !== base.maxQty) patch.maxQty = wanted.maxQty;
  if (wanted.choices && base.choices) {
    const ch: NonNullable<AddonPatch["choices"]> = {};
    for (const c of base.choices) {
      const w = wanted.choices[c.id];
      if (!w) continue;
      const d: { label?: string; price?: number | null } = {};
      if (w.label !== undefined && w.label.trim() && w.label !== c.label) d.label = w.label.trim();
      if (w.price !== undefined && !same(w.price, c.price)) d.price = w.price;
      if (Object.keys(d).length) ch[c.id] = d;
    }
    if (Object.keys(ch).length) patch.choices = ch;
  }
  if (wanted.en) {
    const fileEn = fileEnAddon(id) as Record<string, string | undefined>;
    const en = Object.fromEntries(Object.entries(wanted.en).filter(([k, v]) => v && v !== fileEn[k]));
    if (Object.keys(en).length) patch.en = en;
  }
  const [row] = await db.select().from(catalogAddons).where(eq(catalogAddons.id, id));
  if (!row) {
    if (Object.keys(patch).length) await db.insert(catalogAddons).values({ id, draft: patch as Record<string, unknown> });
  } else if (!Object.keys(patch).length && !row.published) await db.delete(catalogAddons).where(eq(catalogAddons.id, id));
  else await db.update(catalogAddons).set({ draft: patch as Record<string, unknown>, updatedAt: new Date() }).where(eq(catalogAddons.id, id));
  return { ok: true };
}

/** Back to what is published (or to the files, if nothing is). */
export async function discardProductDraft(db: Db, slug: string) {
  const [row] = await db.select().from(catalogProducts).where(eq(catalogProducts.slug, slug));
  if (!row) return;
  if (!row.published) await db.delete(catalogProducts).where(eq(catalogProducts.slug, slug));
  else await db.update(catalogProducts).set({ draft: row.published, updatedAt: new Date() }).where(eq(catalogProducts.slug, slug));
}

export async function discardAddonDraft(db: Db, id: string) {
  const [row] = await db.select().from(catalogAddons).where(eq(catalogAddons.id, id));
  if (!row) return;
  if (!row.published) await db.delete(catalogAddons).where(eq(catalogAddons.id, id));
  else await db.update(catalogAddons).set({ draft: row.published, updatedAt: new Date() }).where(eq(catalogAddons.id, id));
}

/** How many drafts differ from what is published. */
export function draftCount(rows: CatalogRows): number {
  return rows.products.filter((r) => !same(r.draft, r.published ?? {})).length + rows.addons.filter((r) => !same(r.draft, r.published ?? {})).length;
}

/** Publishes every draft (the next build bakes them in). Returns how many changed. */
export async function publishDrafts(db: Db): Promise<number> {
  const rows = await catalogRows(db);
  const now = new Date();
  let n = 0;
  await db.transaction(async (tx) => {
    for (const r of rows.products) {
      if (same(r.draft, r.published ?? {})) continue;
      await tx.update(catalogProducts).set({ published: r.draft, publishedAt: now }).where(eq(catalogProducts.slug, r.slug));
      n++;
    }
    for (const r of rows.addons) {
      if (same(r.draft, r.published ?? {})) continue;
      await tx.update(catalogAddons).set({ published: r.draft, publishedAt: now }).where(eq(catalogAddons.id, r.id));
      n++;
    }
  });
  return n;
}

/** Starts a production build through Vercel's deploy hook (VERCEL_DEPLOY_HOOK_URL). */
export async function triggerDeploy(env: Record<string, string | undefined> = process.env): Promise<"started" | "no_hook" | "failed"> {
  const hook = env.VERCEL_DEPLOY_HOOK_URL?.trim();
  if (!hook || !/^https:\/\/api\.vercel\.com\//.test(hook)) return "no_hook";
  try {
    const res = await fetch(hook, { method: "POST", signal: AbortSignal.timeout(10_000) });
    return res.ok ? "started" : "failed";
  } catch {
    return "failed";
  }
}

export { strip as stripCopied };
