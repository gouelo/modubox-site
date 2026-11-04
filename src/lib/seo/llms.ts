import { dict } from "@/i18n";
import { type Post } from "@/lib/blog";
import { faq, hiddenCategories, plain, products, site } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import type { SeoData } from "./store";

/**
 * /llms.txt (https://llmstxt.org): a short Markdown guide to the site for AI
 * assistants and answer engines, made from data/ so prices and products never
 * drift, with the admin's own opening and sections (Content → llms.txt).
 * /llms-full.txt: the same with every product's facts, every FAQ answer and the blog.
 */
export function llmsText(data: Pick<SeoData, "llms" | "pages">, opts: { full?: boolean; posts?: Post[] } = {}): string {
  const t = dict("he");
  const shown = products.filter((p) => !hiddenCategories.has(p.category));
  const url = (path: string) => `${site.url}${path}`;
  const intro = data.llms.intro?.trim() || `${site.tagline}. ${plain(t.meta.description)}`;
  const extra = data.llms.extra?.trim();
  const facts = (slug: string) => data.pages.get(`/product/${slug}/`)?.keyFacts ?? [];
  const lines = [
    `# ${site.name} – ${site.nameEn}`,
    "",
    `> ${intro.replace(/\s*\n\s*/g, " ")}`,
    "",
    `- טלפון: ${site.phone} · וואטסאפ: +${site.whatsapp} · מייל: ${site.email}`,
    `- מפעל: ${site.factory}; ${site.factory2}`,
    `- אחריות: ${site.warrantyYears} שנים · עד ${site.maxPayments} תשלומים · דירוג בגוגל ${site.rating} (${site.reviewCount} ביקורות)`,
    "",
    "## עמודים",
    "",
    `- [קטלוג המחסנים](${url("/shop/")}): כל המידות והמחירים`,
    `- [שאלות נפוצות](${url("/faq/")})`,
    `- [אחריות](${url("/warranty/")})`,
    `- [תקנון](${url("/terms/")})`,
    `- [אודות](${url("/about/")})`,
    `- [צור קשר](${url("/contact/")})`,
    `- [English](${url("/en/")})`,
    ...(opts.full ? [`- [בלוג](${url("/blog/")})`, `- [המדריך המקוצר](${url("/llms.txt")})`] : [`- [המדריך המלא](${url("/llms-full.txt")})`]),
    "",
    "## מוצרים",
    "",
    ...shown.flatMap((p) => [
      `- [${plain(p.name)}](${url(`/product/${p.slug}/`)}): ${formatILS(p.price, "he")}${p.shortDescription ? `. ${plain(p.shortDescription)}` : ""}`,
      ...(opts.full ? [`  - מידה: ${p.sizeLabel} · שטח: ${p.areaM2} מ"ר · אחריות: ${p.warrantyYears} שנים`, ...facts(p.slug).map((f) => `  - ${f.label}: ${f.value}`)] : []),
    ]),
    "",
    "## שאלות נפוצות",
    "",
    ...(opts.full ? faq : faq.slice(0, 12)).map((f) => `- ${plain(f.q)} ${opts.full ? plain(f.a).replace(/\s+/g, " ") : plain(f.a).replace(/\s+/g, " ").slice(0, 300)}`),
    "",
    ...(opts.full && opts.posts?.length ? ["## מהבלוג", "", ...opts.posts.map((p) => `- [${p.title}](${url(`/blog/${encodeURIComponent(p.slug)}/`)}): ${p.description}`), ""] : []),
    ...(extra ? [extra, ""] : []),
  ];
  return lines.join("\n");
}
