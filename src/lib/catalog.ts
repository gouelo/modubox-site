import productsFile from "../../data/products.json";
import addonsFile from "../../data/addons.json";
import siteFile from "../../data/site.json";
import reviewsFile from "../../data/reviews.json";
import videosFile from "../../data/videos.json";
import galleryFile from "../../data/gallery.json";
import faqFile from "../../data/faq.json";
import clientsFile from "../../data/clients.json";
import productsEn from "../../data/en/products.json";
import addonsEn from "../../data/en/addons.json";
import siteEn from "../../data/en/site.json";
import reviewsEn from "../../data/en/reviews.json";
import videosEn from "../../data/en/videos.json";
import galleryEn from "../../data/en/gallery.json";
import faqEn from "../../data/en/faq.json";
import clientsEn from "../../data/en/clients.json";
import { dict, type Locale } from "@/i18n";
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

/** ltrSizes in Hebrew; English needs no marks. */
const sizes = (locale: Locale, text: string) => (locale === "he" ? ltrSizes(text) : text);

export interface FaqImage {
  src: string;
  alt: string;
  caption?: string;
  /** the photo's own ratio ("16/9", "4/3"), so its frame shows it whole */
  ratio?: string;
}
export interface FaqItem {
  q: string;
  a: string;
  link?: { href: string; label: string };
  cta?: "custom-size";
  open?: boolean;
  media?: "materials" | FaqImage[];
}
export interface FaqGroup {
  id: string;
  title: string;
  image?: FaqImage;
  items: FaqItem[];
}
export interface Review {
  name: string;
  text: string;
  date: string;
  rating: number;
}

type EnProduct = { name?: string; shortDescription?: string; badge?: string; todo?: string; note?: string; pickupNote?: string; deliveryNote?: string };
type EnAddon = { name: string; description?: string; note?: string; choices?: Record<string, string> };
type EnFaqImage = { alt: string; caption?: string };
type EnFaq = { groups: { id: string; title: string; image?: EnFaqImage; items: { q: string; a: string; linkLabel?: string; media?: EnFaqImage[] }[] }[] };

const enProducts = productsEn.products as Record<string, EnProduct>;
const enAddons = addonsEn.addons as Record<string, EnAddon>;

function localizeProduct(p: Product, locale: Locale): Product {
  if (locale === "he") return { ...p, locale, name: ltrSizes(p.name), sizeLabel: ltrSizes(p.sizeLabel) };
  const e = enProducts[p.slug] ?? {};
  return {
    ...p,
    locale,
    name: e.name ?? p.name,
    badge: p.badge ? (e.badge ?? p.badge) : null,
    shortDescription: e.shortDescription ?? p.shortDescription,
    todo: p.todo ? (e.todo ?? p.todo) : undefined,
    fulfillment: {
      ...p.fulfillment,
      note: p.fulfillment.note ? (e.note ?? p.fulfillment.note) : p.fulfillment.note,
      pickupNote: p.fulfillment.pickupNote ? (e.pickupNote ?? p.fulfillment.pickupNote) : undefined,
      deliveryNote: p.fulfillment.deliveryNote ? (e.deliveryNote ?? p.fulfillment.deliveryNote) : undefined,
    },
  };
}

function localizeAddon(a: Addon, locale: Locale): Addon {
  if (locale === "he") return { ...a, description: a.description && ltrSizes(a.description) };
  const e = enAddons[a.id];
  if (!e) return a;
  return {
    ...a,
    name: e.name,
    description: e.description ?? a.description,
    note: a.note ? (e.note ?? a.note) : undefined,
    choices: a.choices?.map((c) => ({ ...c, label: e.choices?.[c.id] ?? c.label })),
  };
}

function localizeFaq(locale: Locale): FaqGroup[] {
  const groups = faqFile.groups as FaqGroup[];
  if (locale === "he") return groups;
  const en = (faqEn as EnFaq).groups;
  const img = (m: FaqImage, e?: EnFaqImage): FaqImage => ({ ...m, alt: e?.alt ?? m.alt, caption: m.caption ? (e?.caption ?? m.caption) : undefined });
  return groups.map((g, gi) => {
    const eg = en[gi];
    return {
      ...g,
      title: eg?.title ?? g.title,
      image: g.image && img(g.image, eg?.image),
      items: g.items.map((it, ii) => {
        const ei = eg?.items[ii];
        return {
          ...it,
          q: ei?.q ?? it.q,
          a: ei?.a ?? it.a,
          link: it.link && { ...it.link, label: ei?.linkLabel ?? it.link.label },
          media: Array.isArray(it.media) ? it.media.map((m, mi) => img(m, ei?.media?.[mi])) : it.media,
        };
      }),
    };
  });
}

function localizeSite(locale: Locale) {
  if (locale === "he") return siteFile;
  return {
    ...siteFile,
    name: siteEn.name,
    tagline: siteEn.tagline,
    whatsappGreeting: siteEn.whatsappGreeting,
    factory: siteEn.factory,
    factory2: siteEn.factory2,
    pickupLocation: siteEn.pickupLocation,
    hours: siteEn.hours || siteFile.hours,
    design3d: { ...siteFile.design3d, label: siteEn.design3dLabel },
    factoryVideo: { ...siteFile.factoryVideo, caption: siteEn.factoryVideoCaption },
  };
}

export type Site = typeof siteFile;
export type CategoryInfo = { id: Category; title: string; subtitle: string; intro?: string };

/** Categories hidden from the catalog and menus (site.json → hiddenCategories). */
export const hiddenCategories = new Set<string>(siteFile.hiddenCategories ?? []);

function build(locale: Locale) {
  const products = (productsFile.products as unknown as Product[]).map((p) => localizeProduct(p, locale));
  const addons = (addonsFile.addons as unknown as Addon[]).map((a) => localizeAddon(a, locale));
  const t = dict(locale).categories;
  const allCategories: CategoryInfo[] = (["modubox", "gilboa", "special"] as const).map((id) => ({ id, title: t[id].title, subtitle: t[id].subtitle, ...(t[id].intro ? { intro: t[id].intro } : {}) }));
  const faqGroups = localizeFaq(locale);
  const enReviews = reviewsEn.reviews;
  const enVideos = videosEn.videos as Record<string, string>;
  const enGallery = galleryEn.images as Record<string, string>;
  const enClients = clientsEn.clients as Record<string, string>;
  return {
    locale,
    products,
    addons,
    addonById: new Map(addons.map((a) => [a.id, a])),
    site: localizeSite(locale) as Site,
    reviews: reviewsFile.reviews.map((r, i): Review => (locale === "he" ? r : { ...r, name: enReviews[i]?.name ?? r.name, text: enReviews[i]?.text ?? r.text })),
    videos: videosFile.videos.map((v) => ({ ...v, title: locale === "he" ? ltrSizes(v.title) : (enVideos[v.youtubeId] ?? v.title) })),
    gallery: galleryFile.images.map((g) => (locale === "he" ? g : { ...g, alt: enGallery[g.src] ?? g.alt })),
    clients: clientsFile.clients.map((c) => (locale === "he" ? c : { ...c, name: enClients[c.file] ?? c.name })),
    faqGroups,
    /** every question, in order */
    faq: faqGroups.flatMap((g) => g.items),
    /** Every product category, hidden ones included (their products and pages stay). */
    allCategories,
    /** The categories the site shows. */
    categories: allCategories.filter((c) => !hiddenCategories.has(c.id)),
  };
}

export type Catalog = ReturnType<typeof build>;
const catalogs: Partial<Record<Locale, Catalog>> = {};

/** The catalog and site content in a language. */
export function catalog(locale: Locale = "he"): Catalog {
  return (catalogs[locale] ??= build(locale));
}

// Hebrew, the default, as plain exports (tests and Hebrew-only code)
const he = catalog("he");
export const products = he.products;
export const addons = he.addons;
export const site = he.site;
export const reviews = he.reviews;
export const videos = he.videos;
export const gallery = he.gallery;
export const faqGroups = he.faqGroups;
export const faq = he.faq;
export const allCategories = he.allCategories;
export const categories = he.categories;

export function getProduct(slug: string, locale: Locale = "he"): Product | undefined {
  return catalog(locale).products.find((p) => p.slug === slug);
}

export function productsIn(category: Category, locale: Locale = "he"): Product[] {
  return catalog(locale).products.filter((p) => p.category === category);
}

export function getAddon(id: string, locale: Locale = "he"): Addon | undefined {
  return catalog(locale).addonById.get(id);
}

/** The floor area a per-m² add-on is priced on: width × length, to 2 decimals. */
export function floorArea(product: Product): number {
  return Math.round(product.widthM * product.depthM * 100) / 100;
}

/** A per-m² add-on (the WPC floor) priced for this product's floor area. */
function priceByArea(a: Addon, product: Product): Addon {
  if (!a.pricePerM2) return a;
  const areaM2 = floorArea(product);
  const price = Math.round(a.pricePerM2 * areaM2);
  return { ...a, areaM2, choices: a.choices?.map((c) => (c.id === a.default ? c : { ...c, price })) };
}

/** The add-ons a product offers, in the product's language, with its price overrides applied. */
export function addonsFor(product: Product): Addon[] {
  const byId = catalog(product.locale ?? "he").addonById;
  return product.addons
    .map((id) => byId.get(id))
    .filter((a): a is Addon => !!a)
    .filter((a) => !a.minWidthM || Math.max(product.widthM, product.depthM) >= a.minWidthM)
    .map((a) =>
      product.addonPriceOverrides[a.id] !== undefined
        ? { ...a, price: product.addonPriceOverrides[a.id] }
        : a,
    )
    .map((a) => priceByArea(a, product));
}

export function lowestPrice(category: Category): number {
  return Math.min(...productsIn(category).map((p) => p.price));
}

export { sizes as localSizes };
