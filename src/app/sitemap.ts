import type { MetadataRoute } from "next";
import { lp } from "@/i18n";
import { allPosts } from "@/lib/blog";
import { hiddenCategories, products, site } from "@/lib/catalog";

export const dynamic = "force-static";

/** Every page in Hebrew and in English, each with its other-language alternate. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/shop/", "/gallery/", "/faq/", "/about/", "/contact/", "/terms/", "/warranty/", "/accessibility/", "/privacy/"];
  const productPages = products.filter((p) => !hiddenCategories.has(p.category)).map((p) => `/product/${p.slug}/`);
  // the blog is in Hebrew only: no English alternate
  const blog: MetadataRoute.Sitemap = [
    { url: `${site.url}/blog/`, changeFrequency: "weekly", priority: 0.5 },
    ...allPosts().map((p) => ({ url: `${site.url}/blog/${encodeURIComponent(p.slug)}/`, lastModified: p.updated, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
  const site_: MetadataRoute.Sitemap = [...pages, ...productPages].flatMap((path) => {
    const languages = { he: `${site.url}${lp("he", path)}`, en: `${site.url}${lp("en", path)}` };
    const priority = path === "/" ? 1 : path.startsWith("/product/") ? 0.8 : 0.7;
    return (["he", "en"] as const).map((locale) => ({
      url: languages[locale],
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages },
    }));
  });
  return [...site_, ...blog];
}
