import type { MetadataRoute } from "next";
import { site } from "@/lib/catalog";
import { blockedCrawlers } from "@/lib/seo/settings";
import { loadSeo } from "@/lib/seo/store";

export const dynamic = "force-static";

/** Everything open but the cart and checkout; AI crawlers the admin blocked (Content → AI crawlers) are kept off the whole site. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const blocked = blockedCrawlers((await loadSeo()).crawlers);
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/cart/", "/checkout/", "/en/cart/", "/en/checkout/"] }, ...blocked.map((userAgent) => ({ userAgent, disallow: "/" }))],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
