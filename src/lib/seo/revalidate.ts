import { revalidatePath } from "next/cache";

/**
 * After a content save: rebuild the static pages, the sitemap, robots.txt and
 * llms.txt with the new settings, on their next visit. Everything at once
 * (titles, FAQ, the business and the blog show across many pages); the site
 * is small, so this is cheap.
 */
export function republishSite() {
  revalidatePath("/", "layout");
  revalidatePath("/en/", "layout");
  for (const p of ["/sitemap.xml", "/robots.txt", "/llms.txt", "/llms-full.txt"]) revalidatePath(p);
}
