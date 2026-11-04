import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { faqBlocks, pageSeo, posts, redirects, siteSettings, type KeyFact, type PostStatus, POST_STATUSES } from "@/db/schema";
import { filePosts } from "@/lib/blog";
import { normalizePath } from "@/lib/seo/meta";
import { fileRules, normalizeSource } from "@/lib/seo/redirects";

/**
 * The content module's writes (SEO per page, FAQ blocks, blog posts,
 * redirects, site settings). Called by the server actions in
 * content-actions.ts after the session check; plain functions so tests can
 * run them on PGlite.
 */

const clean = (v: unknown, max = 5000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const orNull = (v: string) => (v === "" ? null : v);

export interface PageSeoInput {
  title?: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
  keyFacts?: KeyFact[];
}

/** Saves a page's overrides; with nothing set, removes its row (the page is back to its defaults). */
export async function savePageSeo(db: Db, rawPath: string, input: PageSeoInput): Promise<void> {
  const path = normalizePath(rawPath);
  const row = {
    title: orNull(clean(input.title, 200)),
    description: orNull(clean(input.description, 400)),
    ogImage: orNull(clean(input.ogImage, 1000)),
    canonical: orNull(clean(input.canonical, 1000)),
    noindex: !!input.noindex,
    keyFacts: (input.keyFacts ?? []).map((f) => ({ label: clean(f.label, 80), value: clean(f.value, 300) })).filter((f) => f.label && f.value).slice(0, 20),
  };
  const empty = !row.title && !row.description && !row.ogImage && !row.canonical && !row.noindex && row.keyFacts.length === 0;
  if (empty) {
    await db.delete(pageSeo).where(eq(pageSeo.path, path));
    return;
  }
  await db
    .insert(pageSeo)
    .values({ path, ...row })
    .onConflictDoUpdate({ target: pageSeo.path, set: { ...row, updatedAt: new Date() } });
}

/** Replaces a page's questions and answers (empty pairs dropped). */
export async function saveFaqs(db: Db, rawPath: string, items: { q: string; a: string }[]): Promise<void> {
  const path = normalizePath(rawPath);
  const rows = items
    .map((f) => ({ q: clean(f.q, 300), a: clean(f.a, 3000) }))
    .filter((f) => f.q && f.a)
    .slice(0, 30)
    .map((f, i) => ({ path, position: i, ...f }));
  await db.transaction(async (tx) => {
    await tx.delete(faqBlocks).where(eq(faqBlocks.path, path));
    if (rows.length) await tx.insert(faqBlocks).values(rows);
  });
}

export interface PostInput {
  slug: string;
  title: string;
  seoTitle?: string;
  description?: string;
  date: string;
  updated?: string;
  cover?: string;
  coverAlt?: string;
  categories?: string[];
  body: string;
  status: PostStatus;
}

/** A slug as an address segment: letters (Hebrew too), digits and dashes. */
export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export type PostResult = { ok: true; slug: string } | { ok: false; error: string };

/**
 * Saves a post. When its slug changes, the old address redirects (301) to
 * the new one, and a file post under the old slug is hidden.
 */
export async function savePost(db: Db, input: PostInput, previousSlug?: string): Promise<PostResult> {
  const slug = slugify(input.slug || input.title);
  const title = clean(input.title, 200);
  if (!slug) return { ok: false, error: "חסרה כתובת (slug) לפוסט." };
  if (!title) return { ok: false, error: "חסרה כותרת." };
  if (!isDate(input.date)) return { ok: false, error: "תאריך הפרסום לא תקין." };
  if (!POST_STATUSES.includes(input.status)) return { ok: false, error: "סטטוס לא תקין." };
  const prev = previousSlug ? slugify(previousSlug) : "";
  const renamed = !!prev && prev !== slug;
  const exists = (await db.select({ slug: posts.slug }).from(posts).where(eq(posts.slug, slug))).length > 0 || filePosts().some((p) => p.slug === slug);
  if ((renamed || !prev) && exists) return { ok: false, error: "כבר יש פוסט בכתובת הזו." };
  const row = {
    title,
    seoTitle: orNull(clean(input.seoTitle, 200)),
    description: clean(input.description, 400),
    date: input.date,
    updated: input.updated && isDate(input.updated) ? input.updated : null,
    cover: orNull(clean(input.cover, 1000)),
    coverAlt: orNull(clean(input.coverAlt, 300)),
    categories: (input.categories ?? []).map((c) => clean(c, 60)).filter(Boolean).slice(0, 10),
    body: clean(input.body, 200_000),
    status: input.status,
  };
  await db.transaction(async (tx) => {
    await tx
      .insert(posts)
      .values({ slug, ...row })
      .onConflictDoUpdate({ target: posts.slug, set: { ...row, updatedAt: new Date() } });
    if (renamed) {
      const fromFile = filePosts().find((p) => p.slug === prev);
      if (fromFile) {
        await tx
          .insert(posts)
          .values({ slug: prev, title: fromFile.title, date: fromFile.date, status: "hidden" })
          .onConflictDoUpdate({ target: posts.slug, set: { status: "hidden", updatedAt: new Date() } });
      } else await tx.delete(posts).where(eq(posts.slug, prev));
      await upsertRedirect(tx as unknown as Db, { source: `/blog/${prev}`, destination: `/blog/${slug}/`, statusCode: 301, enabled: true, note: "שינוי כתובת של פוסט" });
    }
  });
  return { ok: true, slug };
}

/** Removes a post's row: a file post goes back to its file, a post made in the admin is gone. */
export async function deletePost(db: Db, slug: string): Promise<void> {
  await db.delete(posts).where(eq(posts.slug, slug));
}

/** Copies every file post into the table (posts already there are left as they are). Returns how many were added. */
export async function importPosts(db: Db): Promise<number> {
  const files = filePosts();
  if (!files.length) return 0;
  const added = await db
    .insert(posts)
    .values(files.map((p) => ({ slug: p.slug, title: p.title, seoTitle: p.seoTitle, description: p.description, date: p.date, updated: p.updated, cover: p.cover ?? null, coverAlt: p.coverAlt ?? null, categories: p.categories, body: p.body, status: "published" as const })))
    .onConflictDoNothing()
    .returning({ slug: posts.slug });
  return added.length;
}

export interface RedirectInput {
  id?: number;
  source: string;
  destination: string;
  statusCode: number;
  enabled: boolean;
  note?: string | null;
}

export type RedirectResult = { ok: true } | { ok: false; error: string };

export function checkRedirect(input: RedirectInput): string | null {
  const source = normalizeSource(input.source);
  const dest = input.destination.trim();
  if (source === "/" || source.startsWith("/admin") || source.startsWith("/api") || source.startsWith("/_next")) return "אי אפשר להפנות את הכתובת הזו.";
  if (!dest || !(dest.startsWith("/") || /^https?:\/\//i.test(dest))) return "היעד צריך להתחיל ב־/ או ב־https://";
  if (![301, 302, 307, 308].includes(input.statusCode)) return "סוג הפניה לא תקין.";
  if (normalizeSource(dest) === source) return "ההפניה מפנה לעצמה.";
  return null;
}

async function upsertRedirect(db: Db, input: RedirectInput): Promise<void> {
  const source = normalizeSource(input.source);
  const set = { destination: input.destination.trim(), statusCode: input.statusCode, enabled: input.enabled, note: input.note ?? null, updatedAt: new Date() };
  await db
    .insert(redirects)
    .values({ source, ...set, kind: "admin" })
    .onConflictDoUpdate({ target: redirects.source, set });
}

export async function saveRedirect(db: Db, input: RedirectInput): Promise<RedirectResult> {
  const error = checkRedirect(input);
  if (error) return { ok: false, error };
  if (input.id) {
    const source = normalizeSource(input.source);
    const clash = await db.select({ id: redirects.id }).from(redirects).where(and(eq(sql`lower(${redirects.source})`, source.toLowerCase()), sql`${redirects.id} <> ${input.id}`));
    if (clash.length) return { ok: false, error: "כבר יש הפניה מהכתובת הזו." };
    await db
      .update(redirects)
      .set({ source, destination: input.destination.trim(), statusCode: input.statusCode, enabled: input.enabled, note: input.note ?? null, updatedAt: new Date() })
      .where(eq(redirects.id, input.id));
  } else await upsertRedirect(db, input);
  return { ok: true };
}

export async function deleteRedirect(db: Db, id: number): Promise<void> {
  await db.delete(redirects).where(eq(redirects.id, id));
}

/** Copies data/redirects.json into the table (sources already there are left as they are). Returns how many were added. */
export async function importRedirects(db: Db): Promise<number> {
  const added = await db
    .insert(redirects)
    .values(fileRules().map((r) => ({ source: r.source, destination: r.destination, statusCode: r.statusCode, enabled: true, note: r.note ?? null, kind: r.kind ?? null })))
    .onConflictDoNothing()
    .returning({ id: redirects.id });
  return added.length;
}

export async function saveSetting(db: Db, key: "business" | "llms" | "crawlers", value: unknown): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
}
