import type { MetadataRoute } from "next";
import { lp } from "@/i18n";
import { listPosts } from "@/lib/blog";
import { gallery, photoUrl, products, site } from "@/lib/catalog";
import { categorySlugs } from "@/lib/category-pages";
import { loadSeo } from "@/lib/seo/store";

export const dynamic = "force-static";

/**
 * Every page in Hebrew and in English, each with its other-language alternate; without the pages set to noindex in the admin.
 * Products of hidden categories (Gilboa) are in too: hidden from the catalog, not from search (their old pages redirect to them).
 * Product pages and the gallery list their photos (image sitemap).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { pages: seo } = await loadSeo();
  const indexed = (path: string) => !seo.get(decodeURI(path))?.noindex;
  const pages = ["/", "/shop/", "/gallery/", "/faq/", "/about/", "/contact/", "/terms/", "/warranty/", "/accessibility/", "/privacy/"];
  const categoryPages = categorySlugs.map((slug) => `/${slug}/`);
  const productPages = products.map((p) => `/product/${p.slug}/`);
  const abs = (src: string) => (/^https?:/.test(src) ? src : `${site.url}${photoUrl(src)}`);
  const images = new Map<string, string[]>([
    ...products.map((p): [string, string[]] => [`/product/${p.slug}/`, p.images.map(abs)]),
    ["/gallery/", gallery.map((g) => abs(g.src))],
  ]);
  // the blog is in Hebrew only: no English alternate
  const blog: MetadataRoute.Sitemap = [
    { url: `${site.url}/blog/`, changeFrequency: "weekly", priority: 0.5 },
    ...(await listPosts()).map((p) => ({ url: `${site.url}/blog/${encodeURIComponent(p.slug)}/`, lastModified: p.updated, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
  const site_: MetadataRoute.Sitemap = [...pages, ...categoryPages, ...productPages].flatMap((path) => {
    const languages = { he: `${site.url}${encodeURI(lp("he", path))}`, en: `${site.url}${encodeURI(lp("en", path))}` };
    const priority = path === "/" ? 1 : path.startsWith("/product/") ? 0.8 : 0.7;
    return (["he", "en"] as const).map((locale) => ({
      url: languages[locale],
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages },
      ...(images.get(path)?.length ? { images: images.get(path) } : {}),
    }));
  });
  return [...site_, ...blog].filter((e) => indexed(e.url.slice(site.url.length)));
}
