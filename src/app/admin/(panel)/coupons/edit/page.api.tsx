import Link from "next/link";
import { getDb } from "@/db";
import { ActionForm, ConfirmForm, Field } from "@/components/admin/ContentForms";
import { NoDatabase, PageTitle } from "@/components/admin/ui";
import { deleteCouponAction, saveCouponAction } from "@/lib/admin/coupon-actions";
import { getCoupon } from "@/lib/admin/coupons";
import { requireAdmin } from "@/lib/admin/session";
import { parseCoupons } from "@/lib/coupons";

export const dynamic = "force-dynamic";
export const metadata = { title: "עריכת קופון" };

/** A new coupon (no ?code=) or an existing one. */
export default async function CouponEditor({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  await requireAdmin("coupons");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const code = (await searchParams).code ?? "";
  const row = code ? await getCoupon(db, code) : null;
  if (code && !row) return <PageTitle title="הקופון לא נמצא" sub={<Link href="/admin/coupons/">חזרה לקופונים</Link>} />;
  const inEnv = !!row && parseCoupons(process.env.MODUBOX_COUPONS).has(row.code);
  return (
    <>
      <PageTitle title={row ? `קופון ${row.code}` : "קופון חדש"} sub={<Link href="/admin/coupons/">חזרה לקופונים</Link>} />
      <div className="card p-4 sm:p-5">
        <ActionForm action={saveCouponAction} submit="שמירה">
          {row ? <input type="hidden" name="previous" value={row.code} /> : null}
          <div className="grid gap-5">
            <Field label="קוד" hint="מה שהלקוח מקליד. אותיות באנגלית וספרות; לא משנה אם באותיות גדולות או קטנות.">
              <input name="code" defaultValue={row?.code ?? ""} required maxLength={30} pattern="[A-Za-z0-9_\-]{2,30}" className="field font-mono uppercase" dir="ltr" autoCapitalize="characters" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="סוג ההנחה">
                <select name="kind" defaultValue={row?.kind ?? "percent"} className="field">
                  <option value="percent">אחוזים (%)</option>
                  <option value="fixed">סכום קבוע (₪)</option>
                </select>
              </Field>
              <Field label="גובה ההנחה">
                <input name="value" type="number" min={1} step={1} defaultValue={row?.value ?? ""} required className="field" dir="ltr" />
              </Field>
            </div>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="delivery" defaultChecked={row?.delivery ?? false} className="mt-1 size-5 accent-brand-dark" />
              <span className="text-sm">
                <b>גם על הובלה והתקנה</b>
                <span className="block text-ink-soft">בלי הסימון ההנחה חלה על המוצרים והתוספות בלבד.</span>
              </span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <Field label="סכום הזמנה מינימלי (₪)" hint="ריק = בלי מינימום">
                <input name="minTotal" type="number" min={0} step={1} defaultValue={row?.minTotal ?? ""} className="field" dir="ltr" />
              </Field>
              <Field label="בתוקף עד (כולל)" hint="ריק = בלי תפוגה">
                <input name="until" type="date" defaultValue={row?.until ?? ""} className="field" dir="ltr" />
              </Field>
            </div>
            <Field label="מספר שימושים מקסימלי" hint="הזמנות ששולמו עם הקוד. ריק = בלי הגבלה. כשמגיעים למספר, הקוד מפסיק לעבוד.">
              <input name="maxUses" type="number" min={1} step={1} defaultValue={row?.maxUses ?? ""} className="field w-40" dir="ltr" />
            </Field>
            <Field label="הערה פנימית" hint="למשל: למי נתתם את הקוד. לא מוצג ללקוח.">
              <input name="note" defaultValue={row?.note ?? ""} maxLength={300} className="field" />
            </Field>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="enabled" defaultChecked={row?.enabled ?? true} className="mt-1 size-5 accent-brand-dark" />
              <span className="text-sm">
                <b>פעיל</b>
                <span className="block text-ink-soft">{inEnv ? "כבוי = הקוד לא עובד, גם לא מ־MODUBOX_COUPONS." : "כבוי = הקוד לא עובד, ונשמר כאן להמשך."}</span>
              </span>
            </label>
          </div>
        </ActionForm>
      </div>
      {row ? (
        <ConfirmForm action={deleteCouponAction} confirm={`למחוק את הקופון ${row.code}?${inEnv ? " הוא יחזור לעבוד בתנאים שב־MODUBOX_COUPONS." : ""}`} className="mt-4">
          <input type="hidden" name="code" value={row.code} />
          <button type="submit" className="text-sm font-semibold text-rose-700 underline">
            מחיקת הקופון
          </button>
        </ConfirmForm>
      ) : null}
    </>
  );
}
