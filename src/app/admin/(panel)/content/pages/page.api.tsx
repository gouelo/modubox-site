import Link from "next/link";
import { PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";
import { sitePages, type SitePage } from "@/lib/seo/pages";
import { readSeo } from "@/lib/seo/store";

export const metadata = { title: "דפים ו־SEO" };

const KIND: Record<SitePage["kind"], string> = { page: "דפים", product: "מוצרים", post: "מאמרים בבלוג" };

/** Every public page, with what is set on it; each opens its editor. */
export default async function PagesList({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  await requireAdmin("content");
  const lang = (await searchParams).lang === "en" ? "en" : "he";
  const [pages, seo] = await Promise.all([sitePages(), readSeo()]);
  const shown = pages.filter((p) => p.locale === lang);
  return (
    <>
      <PageTitle
        title="דפים ו־SEO"
        sub="כותרת, תיאור, תמונת שיתוף, שאלות ותשובות ועובדות עיקריות לכל דף."
        action={
          <div className="flex rounded-full bg-white p-1 ring-1 ring-line">
            {(["he", "en"] as const).map((l) => (
              <Link key={l} href={`/admin/content/pages/?lang=${l}`} aria-current={lang === l ? "page" : undefined} className={`rounded-full px-4 py-1.5 text-sm font-bold ${lang === l ? "bg-ink text-white" : ""}`}>
                {l === "he" ? "עברית" : "English"}
              </Link>
            ))}
          </div>
        }
      />
      {(["page", "product", "post"] as const).map((kind) => {
        const list = shown.filter((p) => p.kind === kind);
        if (!list.length) return null;
        return (
          <section key={kind} className="mb-6">
            <h2 className="mb-2 text-sm font-extrabold text-ink-soft">{KIND[kind]}</h2>
            <ul className="card divide-y divide-line">
              {list.map((p) => {
                const s = seo.pages.get(p.path);
                const faqs = seo.faqs.get(p.path)?.length ?? 0;
                const badges = [s?.title || s?.description || s?.ogImage ? "מותאם" : "", s?.noindex ? "noindex" : "", faqs ? `${faqs} שאלות` : "", s?.keyFacts?.length ? `${s.keyFacts.length} עובדות` : ""].filter(Boolean);
                return (
                  <li key={p.path}>
                    <Link href={`/admin/content/page/?path=${encodeURIComponent(p.path)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sand/50">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold">{p.label}</div>
                        <div className="truncate text-xs text-ink-soft" dir="ltr">
                          {p.path}
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {badges.map((b) => (
                          <span key={b} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${b === "noindex" ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
                            {b}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
