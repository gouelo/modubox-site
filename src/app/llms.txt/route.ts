import { dict } from "@/i18n";
import { faq, hiddenCategories, plain, products, site } from "@/lib/catalog";
import { formatILS } from "@/lib/format";

// /llms.txt (https://llmstxt.org): a short Markdown guide to the site for AI
// assistants and answer engines, made from data/ at build time, so prices and
// products never drift. Phase 2 makes it editable in the admin (docs/admin-spec.md).
export const dynamic = "force-static";

export function GET() {
  const t = dict("he");
  const shown = products.filter((p) => !hiddenCategories.has(p.category));
  const url = (path: string) => `${site.url}${path}`;
  const lines = [
    `# ${site.name} – ${site.nameEn}`,
    "",
    `> ${site.tagline}. ${plain(t.meta.description)}`,
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
    "",
    "## מוצרים",
    "",
    ...shown.map((p) => `- [${plain(p.name)}](${url(`/product/${p.slug}/`)}): ${formatILS(p.price, "he")}${p.shortDescription ? `. ${plain(p.shortDescription)}` : ""}`),
    "",
    "## שאלות נפוצות",
    "",
    ...faq.slice(0, 12).map((f) => `- ${plain(f.q)} ${plain(f.a).replace(/\s+/g, " ").slice(0, 300)}`),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
