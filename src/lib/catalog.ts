import productsFile from "../../data/products.json";
import addonsFile from "../../data/addons.json";
import siteFile from "../../data/site.json";
import reviewsFile from "../../data/reviews.json";
import videosFile from "../../data/videos.json";
import galleryFile from "../../data/gallery.json";
import faqFile from "../../data/faq.json";
import type { Addon, Category, Product } from "./types";

/**
 * Sizes like "2×1" flip to "1×2" inside Hebrew text. Wrapping them in
 * left-to-right isolate marks keeps them in the right order everywhere
 * (pages, cart, WhatsApp messages).
 */
export function ltrSizes(text: string): string {
  return text.replace(/\d+(?:\.\d+)?(?:\s*[×xX]\s*\d+(?:\.\d+)?)+/g, (m) => `\u2066${m}\u2069`);
}

/** Removes the isolate marks (for page titles and search engines). */
export function plain(text: string): string {
  return text.replace(/[\u2066-\u2069]/g, "");
}

export const products: Product[] = (productsFile.products as unknown as Product[]).map((p) => ({
  ...p,
  name: ltrSizes(p.name),
  sizeLabel: ltrSizes(p.sizeLabel),
}));
export const addons: Addon[] = (addonsFile.addons as unknown as Addon[]).map((a) => ({
  ...a,
  description: a.description && ltrSizes(a.description),
}));
export const site = siteFile;
export const reviews = reviewsFile.reviews;
export const videos = videosFile.videos.map((v) => ({ ...v, title: ltrSizes(v.title) }));
export const gallery = galleryFile.images;
export const faq = faqFile.faq;

export const categories: { id: Category; title: string; subtitle: string }[] = [
  { id: "modubox", title: "מחסני מודובוקס", subtitle: "פנל מבודד ושלדת אלומיניום · 10 שנות אחריות" },
  { id: "gilboa", title: "מחסני גלבוע", subtitle: "מחסני פלסטיק איכותיים · 5 שנות אחריות" },
  { id: "special", title: "מבנים מיוחדים ושירותים", subtitle: "מבני שירותים, מקלחת ועמדות שמירה" },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function productsIn(category: Category): Product[] {
  return products.filter((p) => p.category === category);
}

const addonById = new Map(addons.map((a) => [a.id, a]));

export function getAddon(id: string): Addon | undefined {
  return addonById.get(id);
}

/** The add-ons a product offers, with its price overrides applied. */
export function addonsFor(product: Product): Addon[] {
  return product.addons
    .map((id) => addonById.get(id))
    .filter((a): a is Addon => !!a)
    .filter((a) => !a.minWidthM || Math.max(product.widthM, product.depthM) >= a.minWidthM)
    .map((a) =>
      product.addonPriceOverrides[a.id] !== undefined
        ? { ...a, price: product.addonPriceOverrides[a.id] }
        : a,
    );
}

export function lowestPrice(category: Category): number {
  return Math.min(...productsIn(category).map((p) => p.price));
}
