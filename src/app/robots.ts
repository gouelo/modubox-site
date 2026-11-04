import type { MetadataRoute } from "next";
import { site } from "@/lib/catalog";
import { AI_CRAWLERS, blockedCrawlers } from "@/lib/seo/settings";
import { loadSeo } from "@/lib/seo/store";

export const dynamic = "force-static";

/** Never for crawlers: the cart, the checkout, the admin and the API. */
export const DISALLOW = ["/cart/", "/checkout/", "/en/cart/", "/en/checkout/", "/admin/", "/api/"];

/**
 * Everything open but DISALLOW. Each AI crawler (Content → AI crawlers) gets a
 * group of its own: allowed (the default) with the same disallows, since a
 * named group replaces `*` for that crawler; or blocked from the whole site.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const blocked = new Set(blockedCrawlers((await loadSeo()).crawlers));
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map(({ agent }) => (blocked.has(agent) ? { userAgent: agent, disallow: "/" } : { userAgent: agent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
