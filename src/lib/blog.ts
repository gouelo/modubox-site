import fs from "node:fs";
import path from "node:path";
import images from "../../data/blog-images.json";

/**
 * The blog: one Markdown file per post in content/blog/<slug>.md, migrated from
 * the old Wix blog (its addresses, /post/<slug>, redirect here: data/redirects.json).
 * Each file opens with a JSON block between --- lines; images live in
 * public/images/blog. Hebrew only.
 */
export interface PostMeta {
  slug: string;
  title: string;
  /** the title for search results and sharing */
  seoTitle: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  updated: string;
  cover?: string;
  coverAlt?: string;
  categories: string[];
  oldUrl?: string;
}

export interface Post extends PostMeta {
  body: string;
}

const DIR = path.join(process.cwd(), "content", "blog");

export function parsePost(slug: string, file: string): Post {
  const m = file.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`content/blog/${slug}.md: no --- header`);
  const meta = JSON.parse(m[1]) as Omit<PostMeta, "slug">;
  return { slug, ...meta, body: m[2].trim() };
}

let cache: Post[] | null = null;

/** Every post, newest first. */
export function allPosts(): Post[] {
  if (cache) return cache;
  cache = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parsePost(f.slice(0, -3), fs.readFileSync(path.join(DIR, f), "utf8")))
    .sort((a, b) => b.date.localeCompare(a.date));
  return cache;
}

export function getPost(slug: string): Post | undefined {
  return allPosts().find((p) => p.slug === slug);
}

/** [width, height] of an image under public/images (blog images only). */
export function imageSize(src: string): [number, number] | undefined {
  const d = (images as Record<string, number[]>)[src];
  return d ? [d[0], d[1]] : undefined;
}

/** Reading time in minutes (about 200 Hebrew words a minute). */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).length / 200));
}

/** "17 בנובמבר 2021" */
export function hebrewDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
