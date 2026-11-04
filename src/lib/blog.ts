import fs from "node:fs";
import path from "node:path";
import type { PostRow } from "@/db/schema";
import images from "../../data/blog-images.json";
import { loadSeo } from "./seo/store";

/**
 * The blog: one Markdown file per post in content/blog/<slug>.md, migrated from
 * the old Wix blog (its addresses, /post/<slug>, redirect here: data/redirects.json).
 * Each file opens with a JSON block between --- lines; images live in
 * public/images/blog. Hebrew only.
 *
 * The admin's blog editor saves posts in the database (table posts): a row
 * replaces the file of its slug, adds a new post, or ("hidden", "draft")
 * keeps one off the site. listPosts() and findPost() give the site's posts;
 * filePosts() only the files.
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

const newestFirst = (a: Post, b: Post) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug);

/** Every post in content/blog, newest first. */
export function filePosts(): Post[] {
  if (cache) return cache;
  cache = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parsePost(f.slice(0, -3), fs.readFileSync(path.join(DIR, f), "utf8")))
    .sort(newestFirst);
  return cache;
}

export function rowToPost(r: PostRow): Post {
  return {
    slug: r.slug,
    title: r.title,
    seoTitle: r.seoTitle?.trim() || r.title,
    description: r.description,
    date: r.date,
    updated: r.updated || r.date,
    ...(r.cover ? { cover: r.cover } : {}),
    ...(r.coverAlt ? { coverAlt: r.coverAlt } : {}),
    categories: r.categories ?? [],
    body: r.body,
  };
}

/** The files with the saved posts on top; with drafts: drafts too (the admin's preview). */
export function mergePosts(files: Post[], rows: PostRow[], drafts = false): Post[] {
  const bySlug = new Map(files.map((p) => [p.slug, p]));
  for (const r of rows) {
    if (r.status === "published" || (drafts && r.status === "draft")) bySlug.set(r.slug, rowToPost(r));
    else bySlug.delete(r.slug);
  }
  return [...bySlug.values()].sort(newestFirst);
}

/** The site's posts, newest first. */
export async function listPosts(): Promise<Post[]> {
  return mergePosts(filePosts(), (await loadSeo()).posts);
}

export async function findPost(slug: string, drafts = false): Promise<Post | undefined> {
  return mergePosts(filePosts(), (await loadSeo()).posts, drafts).find((p) => p.slug === slug);
}

/** The large version of a cover: the optimized copy of a site image (/_img/…-1600.webp), or an uploaded image's own address. */
export function coverUrl(cover: string, siteUrl: string): string {
  return /^https?:/.test(cover) ? cover : `${siteUrl}/_img/${cover.replace(/\.\w+$/, "")}-1600.webp`;
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
