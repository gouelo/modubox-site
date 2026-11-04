import Link from "next/link";
import { getDb } from "@/db";
import { ActionForm } from "@/components/admin/ContentForms";
import { Empty, ils, NoDatabase, PageTitle } from "@/components/admin/ui";
import { importCouponsAction } from "@/lib/admin/coupon-actions";
import { listCoupons, type CouponListItem } from "@/lib/admin/coupons";
import { requireAdmin } from "@/lib/admin/session";
import { israelToday } from "@/lib/coupons";

export const dynamic = "force-dynamic";
export const metadata = { title: "קופונים" };

const day = (d: string) => d.split("-").reverse().join(".");

function terms(c: CouponListItem["coupon"], maxUses: number | null | undefined): string {
  return [
    c.kind === "percent" ? `${c.value}% הנחה` : `${ils(c.value)} הנחה`,
    c.delivery ? "כולל הובלה והתקנה" : "על המוצרים",
    c.min ? `מעל ${ils(c.min)}` : "",
    c.until ? `עד ${day(c.until)}` : "",
    maxUses ? `עד ${maxUses} שימושים` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function state(i: CouponListItem, today: string): { label: string; tone: string } {
  if (i.row && !i.row.enabled) return { label: "כבוי", tone: "bg-sand text-ink-soft" };
  if (i.coupon.until && today > i.coupon.until) return { label: "פג תוקף", tone: "bg-rose-50 text-rose-700" };
  if (i.row?.maxUses && i.uses >= i.row.maxUses) return { label: "נוצל", tone: "bg-rose-50 text-rose-700" };
  return { label: "פעיל", tone: "bg-emerald-50 text-emerald-800" };
}

/** Coupon codes: the admin's, and those still only in MODUBOX_COUPONS. */
export default async function CouponsPage({ searchParams }: { searchParams: Promise<{ saved?: string; imported?: string }> }) {
  await requireAdmin("coupons");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const [list, { saved, imported }] = await Promise.all([listCoupons(db), searchParams]);
  const today = israelToday();
  const envOnly = list.filter((i) => !i.row);
  return (
    <>
      <PageTitle
        title="קופונים"
        sub="קוד שהלקוח מקליד בסל או בתשלום. שינוי כאן עובד בקופה מיד."
        action={
          <Link href="/admin/coupons/edit/" className="btn-brand min-h-11 px-4 text-sm">
            + קופון חדש
          </Link>
        }
      />
      {saved ? (
        <p role="status" className="mb-3 text-sm font-semibold text-emerald-700">
          ✓ הקופון נשמר, והוא כבר עובד בקופה.
        </p>
      ) : null}
      {imported ? (
        <p role="status" className="mb-3 text-sm font-semibold text-emerald-700">
          ✓ {imported === "0" ? "כל הקופונים כבר היו כאן." : `יובאו ${imported} קופונים. מעכשיו עורכים אותם כאן.`}
        </p>
      ) : null}
      {list.length ? (
        <ul className="card divide-y divide-line">
          {list.map((i) => {
            const s = state(i, today);
            const body = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <bdi dir="ltr" className="font-mono text-[15px] font-extrabold">
                      {i.code}
                    </bdi>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.tone}`}>{s.label}</span>
                    {!i.row ? <span className="text-xs text-ink-soft">(ממשתנה הסביבה)</span> : null}
                  </div>
                  <div className="mt-0.5 text-sm text-ink-soft">{terms(i.coupon, i.row?.maxUses)}</div>
                  {i.row?.note ? <div className="mt-0.5 truncate text-xs text-ink-soft">{i.row.note}</div> : null}
                </div>
                <div className="shrink-0 text-end text-sm">
                  <div className="font-bold">{i.uses === 1 ? "הזמנה אחת" : `${i.uses} הזמנות`}</div>
                  {i.uses ? (
                    <div className="text-xs text-ink-soft">
                      מכירות {ils(i.total)} · הנחה {ils(i.discount)}
                    </div>
                  ) : null}
                </div>
              </>
            );
            return (
              <li key={i.code}>
                {i.row ? (
                  <Link href={`/admin/coupons/edit/?code=${encodeURIComponent(i.code)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sand/50">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>עוד אין קופונים. “קופון חדש” למעלה.</Empty>
      )}
      <p className="mt-3 text-xs leading-5 text-ink-soft">שימושים: הזמנות ששולמו עם הקוד (בלי הזמנות בדיקה, ובלי כאלה שבוטלו או זוכו). “מכירות” הוא הסכום ששולם בהן.</p>
      {envOnly.length ? (
        <section className="card mt-5 p-4">
          <h2 className="text-base font-extrabold">קופונים ממשתנה הסביבה</h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {envOnly.length === 1 ? "קופון אחד מגיע" : `${envOnly.length} קופונים מגיעים`} מ־MODUBOX_COUPONS ב־Vercel, והם ממשיכים לעבוד. כדי לערוך אותם כאן: ייבוא. אחרי הייבוא הגרסה שכאן קובעת, ואפשר (לא חובה) למחוק את המשתנה.
          </p>
          <ActionForm action={importCouponsAction} submit="ייבוא לממשק" />
        </section>
      ) : null}
    </>
  );
}
