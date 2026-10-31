import type { MetadataRoute } from "next";
import { hiddenCategories, products, site } from "@/lib/catalog";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "shop/", "gallery/", "faq/", "about/", "contact/", "terms/", "warranty/"];
  return [
    ...pages.map((p) => ({ url: `${site.url}/${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...products.filter((p) => !hiddenCategories.has(p.category)).map((p) => ({ url: `${site.url}/product/${p.slug}/`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
