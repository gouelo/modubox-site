import Link from "next/link";
import { getDb } from "@/db";
import { PageTitle, ils } from "@/components/admin/ui";
import { catalogRows, changeState, liveOverrides, overridesOf, productsWith, stripCopied } from "@/lib/admin/catalog";
import { missingInfo } from "@/lib/admin/missing-info";
import { requireAdmin } from "@/lib/admin/session";
import { ltrSizes, plain } from "@/lib/catalog";

export const metadata = { title: "קטלוג" };

const CATEGORY: Record<string, string> = { modubox: "מודובוקס", gilboa: "גלבוע", special: "מיוחדים" };

/** Every product with its price as it will be after publishing, and what changed. */
export default async function CatalogPage() {
  await requireAdmin("catalog");
  const rows = await catalogRows(getDb()!);
  const live = liveOverrides();
  const products = productsWith(overridesOf(rows, "draft"));
  const liveProducts = new Map(productsWith(live).map((p) => [p.slug, p]));
  return (
    <>
      <PageTitle title="קטלוג" sub="מחירים, תוספות, הובלה והתקנה ותמונות. שינוי נשמר כטיוטה, ועולה לאתר בלחיצה על “פרסום לאתר”. “חסר מידע” = פרטים שעוד חסרים למוצר (רק כאן, לא באתר)." />
      {(["modubox", "gilboa", "special"] as const).map((cat) => {
        const list = products.filter((p) => p.category === cat);
        if (!list.length) return null;
        return (
          <section key={cat} className="mb-6">
            <h2 className="mb-2 text-sm font-extrabold text-ink-soft">{CATEGORY[cat]}</h2>
            <ul className="card divide-y divide-line">
              {list.map((p) => {
                const row = rows.products.find((r) => r.slug === p.slug);
                const state = row ? changeState(row.draft, row.published, live.products[p.slug] && stripCopied(live.products[p.slug])) : null;
                const was = liveProducts.get(p.slug);
                const missing = missingInfo(p, products);
                return (
                  <li key={p.slug}>
                    <Link href={`/admin/catalog/product/?slug=${p.slug}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-sand/50 ${p.hidden ? "opacity-50" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold">{ltrSizes(plain(p.name))}</div>
                        <div className="truncate text-xs text-ink-soft" dir="ltr">
                          {p.slug}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-extrabold tabular-nums" dir="ltr">
                          {was && was.price !== p.price ? <s className="me-1.5 font-normal text-ink-soft">{ils(was.price)}</s> : null}
                          {ils(p.price)}
                        </span>
                        <span className="flex gap-1">
                          {missing.length ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900" title={missing.join(" · ")}>חסר מידע</span> : null}
                          {p.hidden ? <span className="rounded-full bg-line px-2 py-0.5 text-xs font-bold">מוסתר</span> : null}
                          {!was ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800">חדש</span> : null}
                          {state === "draft" ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">טיוטה</span> : state === "publishing" ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800">בפרסום</span> : null}
                        </span>
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
