import { eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { siteSettings } from "@/db/schema";
import siteFile from "../../../data/site.json";
import siteEn from "../../../data/en/site.json";
import promoFile from "../../../data/promo.json";
import faqFile from "../../../data/faq.json";
import faqEn from "../../../data/en/faq.json";
import reviewsFile from "../../../data/reviews.json";
import reviewsEn from "../../../data/en/reviews.json";
import overridesFile from "../../../data/catalog-overrides.json";
import type { CatalogOverrides, FaqPatch, FaqRow, PromoData, ReviewRow, ReviewsPatch, SitePatch } from "../catalog-overrides";

/**
 * The site's texts and reviews in the admin (/admin/site). Each is saved whole
 * in site_settings and baked into the site at the next build, like the
 * catalog (scripts/catalog-sync.mjs → data/catalog-overrides.json), because
 * the pages and the browser's code show them. Server code only.
 */

export const TEXT_KEYS = { site: "site_texts", promo: "promo", faq: "faq", reviews: "reviews" } as const;
export type TextKind = keyof typeof TEXT_KEYS;
export const TEXT_LABEL: Record<TextKind, string> = { site: "פרטי העסק", promo: "מבצע החודש", faq: "שאלות נפוצות", reviews: "ביקורות" };

/** What the live site was built with (absent: the data/ files). */
export function bakedTexts(o: CatalogOverrides = overridesFile as unknown as CatalogOverrides): Partial<Record<TextKind, unknown>> {
  return { site: o.site, promo: o.promo, faq: o.faq, reviews: o.reviews };
}

export async function savedTexts(db: Db): Promise<Partial<Record<TextKind, unknown>>> {
  const rows = await db.select().from(siteSettings).where(inArray(siteSettings.key, Object.values(TEXT_KEYS)));
  const out: Partial<Record<TextKind, unknown>> = {};
  for (const [kind, key] of Object.entries(TEXT_KEYS) as [TextKind, string][]) {
    const r = rows.find((x) => x.key === key);
    if (r) out[kind] = r.value;
  }
  return out;
}

/** JSON with sorted keys: Postgres's jsonb doesn't keep the order the keys were written in. */
export function stableJson(v: unknown): string {
  return JSON.stringify(v, (_, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x));
}

/** The kinds whose saved version (or its absence: back to the files) is not what the site was built with. */
export function pendingTexts(saved: Partial<Record<TextKind, unknown>>, baked = bakedTexts()): TextKind[] {
  return (Object.keys(TEXT_KEYS) as TextKind[]).filter((k) => stableJson(saved[k] ?? null) !== stableJson(baked[k] ?? null));
}

export async function saveText(db: Db, kind: TextKind, value: unknown): Promise<void> {
  const key = TEXT_KEYS[kind];
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
}

/** Back to the files: the setting goes, and the next build shows data/ again. */
export async function resetText(db: Db, kind: TextKind): Promise<void> {
  await db.delete(siteSettings).where(eq(siteSettings.key, TEXT_KEYS[kind]));
}

/* ---- business details ---- */

export const SITE_FIELDS = ["phone", "phoneAlt", "whatsapp", "whatsappGreeting", "email", "factory", "factory2", "pickupLocation", "hours", "rating", "reviewCount", "floatingConfiguratorCta"] as const;
export const SITE_EN_FIELDS = ["whatsappGreeting", "factory", "factory2", "pickupLocation", "hours"] as const;

/** The files' values, as the form starts. */
export function fileSiteTexts(): Required<Omit<SitePatch, "en">> & { en: Required<NonNullable<SitePatch["en"]>> } {
  return {
    phone: siteFile.phone,
    phoneAlt: siteFile.phoneAlt,
    whatsapp: siteFile.whatsapp,
    whatsappGreeting: siteFile.whatsappGreeting,
    email: siteFile.email,
    factory: siteFile.factory,
    factory2: siteFile.factory2,
    pickupLocation: siteFile.pickupLocation,
    hours: siteFile.hours.startsWith("TODO") ? "" : siteFile.hours,
    rating: siteFile.rating,
    reviewCount: siteFile.reviewCount,
    floatingConfiguratorCta: siteFile.floatingConfiguratorCta,
    en: { whatsappGreeting: siteEn.whatsappGreeting, factory: siteEn.factory, factory2: siteEn.factory2, pickupLocation: siteEn.pickupLocation, hours: siteEn.hours },
  };
}

/** Only what differs from the files (so a later change to data/ still shows where the admin didn't touch). */
export function siteDiff(wanted: ReturnType<typeof fileSiteTexts>): SitePatch {
  const base = fileSiteTexts();
  const out: SitePatch = {};
  for (const k of SITE_FIELDS) if (wanted[k] !== base[k]) (out as Record<string, unknown>)[k] = wanted[k];
  const en: NonNullable<SitePatch["en"]> = {};
  for (const k of SITE_EN_FIELDS) if (wanted.en[k] !== base.en[k]) en[k] = wanted.en[k];
  if (Object.keys(en).length) out.en = en;
  return out;
}

export function siteError(s: ReturnType<typeof fileSiteTexts>): string | null {
  const phone = /^[0-9*][0-9\s-]{3,14}$/;
  if (!phone.test(s.phone)) return "טלפון לא תקין.";
  if (s.phoneAlt && !phone.test(s.phoneAlt)) return "טלפון נוסף לא תקין.";
  if (!/^972\d{8,9}$/.test(s.whatsapp)) return "וואטסאפ: המספר בפורמט בינלאומי, ספרות בלבד, למשל 972529555057.";
  if (!/^\S+@\S+\.\S+$/.test(s.email)) return "מייל לא תקין.";
  if (!(s.rating >= 1 && s.rating <= 5)) return "דירוג: בין 1 ל־5.";
  if (!(Number.isInteger(s.reviewCount) && s.reviewCount >= 0)) return "מספר ביקורות: מספר שלם.";
  if (!s.whatsappGreeting.trim() || !s.factory.trim()) return "הודעת הפתיחה בוואטסאפ והכתובת לא יכולות להיות ריקות.";
  return null;
}

/** The form's values: the files with the saved changes on top. */
export function siteForm(saved: SitePatch | undefined): ReturnType<typeof fileSiteTexts> {
  const base = fileSiteTexts();
  if (!saved) return base;
  const { en, ...rest } = saved;
  return { ...base, ...rest, en: { ...base.en, ...(en ?? {}) } } as ReturnType<typeof fileSiteTexts>;
}

/* ---- promotion ---- */

export function filePromo(): PromoData {
  const p: PromoData & { _readme?: string } = structuredClone(promoFile);
  delete p._readme;
  return p;
}

export function promoError(p: PromoData): string | null {
  if (p.enabled && (!p.title.trim() || !p.cta.label.trim())) return "כותרת וטקסט לכפתור הם חובה כשהבאנר מוצג.";
  if (p.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(p.endDate)) return "תאריך סיום לא תקין.";
  if (!(p.cta.href === "whatsapp" || /^\/[\w\-/?=&#%.]*$/.test(p.cta.href) || /^https:\/\/\S+$/.test(p.cta.href))) return "קישור הכפתור: whatsapp, דף באתר שמתחיל ב־/ (למשל /shop/), או כתובת https.";
  return null;
}

/* ---- FAQ ---- */

type FaqFileGroup = { id: string; title: string; items: { q: string; a: string }[] };
type FaqEnGroup = { title: string; items: { q: string; a: string }[] };

export interface FaqEditorGroup {
  id: string;
  title: string;
  enTitle: string;
  rows: (FaqRow & { fileQ?: string })[];
}

/** Each group's rows as the editor starts: the saved ones, or the file's. */
export function faqForm(saved: FaqPatch | undefined): FaqEditorGroup[] {
  const groups = faqFile.groups as FaqFileGroup[];
  const en = (faqEn as { groups: FaqEnGroup[] }).groups;
  return groups.map((g, gi) => {
    const fileRows: FaqRow[] = g.items.map((it, i) => ({ from: i, q: it.q, a: it.a, en: { q: en[gi]?.items[i]?.q ?? "", a: en[gi]?.items[i]?.a ?? "" } }));
    const p = saved?.groups[g.id];
    return { id: g.id, title: p?.title || g.title, enTitle: p?.enTitle || en[gi]?.title || "", rows: p ? p.items : fileRows };
  });
}

export function cleanFaqRows(rows: unknown, groupSize: number): FaqRow[] | null {
  if (!Array.isArray(rows) || rows.length > 60) return null;
  const out: FaqRow[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") return null;
    const x = r as Record<string, unknown>;
    const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const from = typeof x.from === "number" && Number.isInteger(x.from) && x.from >= 0 && x.from < groupSize ? x.from : undefined;
    const en = (x.en ?? {}) as Record<string, unknown>;
    const row: FaqRow = { ...(from !== undefined ? { from } : {}), q: s(x.q, 300), a: s(x.a, 3000), en: { q: s(en.q, 300), a: s(en.a, 3000) }, ...(x.hidden === true ? { hidden: true } : {}) };
    if (!row.q || !row.a) return null;
    out.push(row);
  }
  return out;
}

/* ---- reviews ---- */

export function fileReviews(): ReviewRow[] {
  const en = reviewsEn.reviews as { name: string; text: string }[];
  return reviewsFile.reviews.map((r, i) => ({ name: r.name, date: r.date, rating: r.rating, text: r.text, en: { name: en[i]?.name ?? "", text: en[i]?.text ?? "" } }));
}

export function reviewsForm(saved: ReviewsPatch | undefined): ReviewRow[] {
  return saved?.reviews ?? fileReviews();
}

export function cleanReviews(rows: unknown): ReviewRow[] | null {
  if (!Array.isArray(rows) || rows.length > 100) return null;
  const out: ReviewRow[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") return null;
    const x = r as Record<string, unknown>;
    const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const en = (x.en ?? {}) as Record<string, unknown>;
    const rating = Number(x.rating);
    const row: ReviewRow = { name: s(x.name, 80), date: s(x.date, 10), rating, text: s(x.text, 3000), en: { name: s(en.name, 80), text: s(en.text, 3000) }, ...(x.hidden === true ? { hidden: true } : {}) };
    if (!row.name || !row.text || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) return null;
    out.push(row);
  }
  return out;
}
