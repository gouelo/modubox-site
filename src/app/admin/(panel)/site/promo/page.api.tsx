import { getDb } from "@/db";
import { ActionForm, Field } from "@/components/admin/ContentForms";
import { ResetForm } from "@/components/admin/ResetForm";
import { PageTitle } from "@/components/admin/ui";
import { savePromoAction } from "@/lib/admin/site-actions";
import { filePromo, savedTexts } from "@/lib/admin/site-texts";
import { requireAdmin } from "@/lib/admin/session";
import type { PromoData } from "@/lib/catalog-overrides";

export const dynamic = "force-dynamic";
export const metadata = { title: "מבצע החודש" };

/** The banner under the home page's hero. */
export default async function PromoPage() {
  await requireAdmin("site");
  const saved = (await savedTexts(getDb()!)).promo as PromoData | undefined;
  const p = saved ?? filePromo();
  return (
    <>
      <PageTitle title="מבצע החודש" sub="הפס בדף הבית מתחת לתמונה הראשית. אחרי תאריך הסיום הוא נעלם לבד. מתנות המבצע בעגלה (כוננית / רצפת פרקט) מוגדרות בקובץ data/promo-gifts.json." />
      <div className="card p-4 sm:p-5">
        <ActionForm action={savePromoAction} submit="שמירה">
          <div className="grid gap-5">
            <label className="flex items-center gap-3">
              <input type="checkbox" name="enabled" defaultChecked={p.enabled} className="size-5 accent-brand-dark" />
              <b className="text-sm">מוצג באתר</b>
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="תווית קטנה">
                <input name="eyebrow" defaultValue={p.eyebrow} className="field" />
              </Field>
              <Field label="תאריך סיום" hint="ריק = בלי תאריך">
                <input name="endDate" type="date" defaultValue={p.endDate} className="field" dir="ltr" />
              </Field>
            </div>
            <Field label="כותרת">
              <input name="title" defaultValue={p.title} className="field" />
            </Field>
            <Field label="שורת הסבר">
              <input name="text" defaultValue={p.text} className="field" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="טקסט הכפתור">
                <input name="ctaLabel" defaultValue={p.cta.label} className="field" />
              </Field>
              <Field label="לאן הכפתור מוביל" hint="whatsapp = וואטסאפ עם הודעה מוכנה; או דף באתר, למשל /shop/">
                <input name="ctaHref" defaultValue={p.cta.href} className="field" dir="ltr" />
              </Field>
            </div>
            <Field label="ההודעה המוכנה בוואטסאפ">
              <input name="whatsappText" defaultValue={p.cta.whatsappText ?? ""} className="field" />
            </Field>
            <details className="rounded-xl border border-line p-4">
              <summary className="cursor-pointer text-sm font-bold">באנגלית (/en/)</summary>
              <div className="mt-4 grid gap-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" name="en_enabled" defaultChecked={p.en.enabled} className="size-5 accent-brand-dark" />
                  <b className="text-sm">Shown on the English site</b>
                </label>
                <Field label="Eyebrow">
                  <input name="en_eyebrow" defaultValue={p.en.eyebrow} className="field" dir="ltr" />
                </Field>
                <Field label="Title">
                  <input name="en_title" defaultValue={p.en.title} className="field" dir="ltr" />
                </Field>
                <Field label="Text">
                  <input name="en_text" defaultValue={p.en.text} className="field" dir="ltr" />
                </Field>
                <Field label="Button">
                  <input name="en_ctaLabel" defaultValue={p.en.ctaLabel} className="field" dir="ltr" />
                </Field>
                <Field label="WhatsApp message">
                  <input name="en_whatsappText" defaultValue={p.en.whatsappText ?? ""} className="field" dir="ltr" />
                </Field>
              </div>
            </details>
          </div>
        </ActionForm>
      </div>
      {saved ? <ResetForm kind="promo" /> : null}
    </>
  );
}
