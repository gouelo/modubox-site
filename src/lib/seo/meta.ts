import type { Metadata } from "next";
import type { PageSeo } from "@/db/schema";
import { loadSeo } from "./store";

/** A page's address from its metadata: its canonical (every public page sets one, src/i18n/meta.ts). */
export function metaPath(meta: Metadata): string | null {
  const c = meta.alternates?.canonical;
  const s = typeof c === "string" ? c : c instanceof URL ? c.pathname : (c?.url?.toString() ?? null);
  return s ? normalizePath(s) : null;
}

/** "/shop" → "/shop/", percent-encoding decoded: how page_seo keys a page. */
export function normalizePath(path: string): string {
  let p = path.trim();
  try {
    p = decodeURI(p);
  } catch {}
  p = p.replace(/[?#].*$/, "");
  if (!p.startsWith("/")) p = `/${p}`;
  if (!p.endsWith("/")) p += "/";
  return p;
}

/** The page's metadata with what the admin saved for it on top (title, description, image, canonical, noindex). */
export function applySeo(meta: Metadata, s: PageSeo | undefined): Metadata {
  if (!s) return meta;
  const out: Metadata = { ...meta };
  const og = { ...(meta.openGraph ?? {}) } as NonNullable<Metadata["openGraph"]>;
  const title = s.title?.trim();
  const description = s.description?.trim();
  if (title) {
    // as typed: the admin sees and edits the whole title, so no "| מודובוקס" template
    out.title = { absolute: title };
    og.title = title;
  }
  if (description) {
    out.description = description;
    og.description = description;
  }
  if (s.ogImage?.trim()) og.images = [{ url: s.ogImage.trim() }];
  if (title || description || s.ogImage?.trim()) out.openGraph = og;
  if (s.canonical?.trim()) out.alternates = { ...(meta.alternates ?? {}), canonical: s.canonical.trim() };
  if (s.noindex) out.robots = { index: false, follow: true };
  return out;
}

/** For a page's generateMetadata: its default metadata with the saved overrides. */
export async function withSeo(meta: Metadata): Promise<Metadata> {
  const path = metaPath(meta);
  if (!path) return meta;
  return applySeo(meta, (await loadSeo()).pages.get(path));
}
