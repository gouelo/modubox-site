import { asc } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { faqBlocks, pageSeo, posts, siteSettings, type FaqBlock, type PageSeo, type PostRow } from "@/db/schema";
import type { AiCrawlers, Business, LlmsSettings } from "./settings";

/**
 * What the admin's content module saved (src/app/admin/(panel)/content),
 * read by the public pages. Everything is an override of the defaults in the
 * code and data/: when there is no database (the GitHub Pages export, a local
 * run), or it fails or is slow, the site shows its defaults, exactly as before.
 *
 * The pages are static: they read this when they are built and again when an
 * admin save revalidates them (src/lib/seo/revalidate.ts).
 */
export interface SeoData {
  pages: Map<string, PageSeo>;
  faqs: Map<string, FaqBlock[]>;
  posts: PostRow[];
  business: Partial<Business>;
  llms: Partial<LlmsSettings>;
  crawlers: AiCrawlers;
}

export const EMPTY: SeoData = { pages: new Map(), faqs: new Map(), posts: [], business: {}, llms: {}, crawlers: {} };

const TIMEOUT_MS = 4000;

async function query(): Promise<SeoData> {
  const db = getDb();
  if (!db) return EMPTY;
  const [pageRows, faqRows, postRows, settingRows] = await Promise.all([
    db.select().from(pageSeo),
    db.select().from(faqBlocks).orderBy(asc(faqBlocks.path), asc(faqBlocks.position), asc(faqBlocks.id)),
    db.select().from(posts),
    db.select().from(siteSettings),
  ]);
  const faqs = new Map<string, FaqBlock[]>();
  for (const f of faqRows) faqs.set(f.path, [...(faqs.get(f.path) ?? []), f]);
  const setting = (key: string) => (settingRows.find((s) => s.key === key)?.value ?? {}) as never;
  return {
    pages: new Map(pageRows.map((p) => [p.path, p])),
    faqs,
    posts: postRows,
    business: setting("business"),
    llms: setting("llms"),
    crawlers: setting("crawlers"),
  };
}

/** The saved overrides, or none when they can't be read in time. */
export async function readSeo(): Promise<SeoData> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      query(),
      new Promise<SeoData>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
      }),
    ]);
  } catch (e) {
    console.error("[seo] overrides not read, defaults shown:", e instanceof Error ? e.message : e);
    return EMPTY;
  } finally {
    clearTimeout(timer);
  }
}

// While building, the 70-odd pages share one read for a little while; at run
// time (a page rebuilt after a save) each render reads afresh, so a rebuilt
// page never shows what was there before the save.
const building = process.env.NEXT_PHASE === "phase-production-build";
let buildMemo: { at: number; data: Promise<SeoData> } | null = null;

export const loadSeo = cache(async (): Promise<SeoData> => {
  if (!building) return readSeo();
  if (!buildMemo || Date.now() - buildMemo.at > 30_000) buildMemo = { at: Date.now(), data: readSeo() };
  return buildMemo.data;
});
