import Link from "next/link";
import { getDb } from "@/db";
import { ActionForm, Field } from "@/components/admin/ContentForms";
import { PageTitle } from "@/components/admin/ui";
import { ResetForm } from "@/components/admin/ResetForm";
import { saveSiteTextsAction } from "@/lib/admin/site-actions";
import { savedTexts, siteForm } from "@/lib/admin/site-texts";
import { requireAdmin } from "@/lib/admin/session";
import type { SitePatch } from "@/lib/catalog-overrides";

export const dynamic = "force-dynamic";
export const metadata = { title: "פרטי העסק באתר" };

/** Phones, WhatsApp, addresses, hours, the Google rating and the floating 3D shed. */
export default async function SiteTextsPage() {
  await requireAdmin("site");
  const saved = (await savedTexts(getDb()!)).site as SitePatch | undefined;
  const v = siteForm(saved);
  return (
    <>
      <PageTitle
        title="פרטי העסק באתר"
        sub={
          <>
            בכותרת, בפוטר, בדף צור קשר, בכפתורי הוואטסאפ ובמיילים ללקוחות. מה שמנועי חיפוש קוראים (JSON-LD) נקבע ב<Link href="/admin/content/business/" className="underline">תוכן ← פרטי העסק</Link>, ושם שדה ריק לוקח את הערך מכאן.
          </>
        }
      />
      <div className="card p-4 sm:p-5">
        <ActionForm action={saveSiteTextsAction} submit="שמירה">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="טלפון ראשי">
              <input name="phone" defaultValue={v.phone} required className="field" dir="ltr" />
            </Field>
            <Field label="טלפון נוסף">
              <input name="phoneAlt" defaultValue={v.phoneAlt} className="field" dir="ltr" />
            </Field>
            <Field label="וואטסאפ" hint="המספר שאליו נפתחת השיחה. אפשר 052… או 97252…">
              <input name="whatsapp" defaultValue={v.whatsapp} required className="field" dir="ltr" inputMode="tel" />
            </Field>
            <Field label="מייל">
              <input name="email" type="email" defaultValue={v.email} required className="field" dir="ltr" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="הודעת פתיחה בוואטסאפ" hint="הטקסט המוכן כשלוחצים על כפתור הוואטסאפ באתר.">
                <input name="whatsappGreeting" defaultValue={v.whatsappGreeting} required className="field" />
              </Field>
            </div>
            <Field label="מפעל (כתובת)">
              <input name="factory" defaultValue={v.factory} required className="field" />
            </Field>
            <Field label="סניף / כתובת נוספת">
              <input name="factory2" defaultValue={v.factory2} className="field" />
            </Field>
            <Field label="נקודת איסוף עצמי">
              <input name="pickupLocation" defaultValue={v.pickupLocation} className="field" />
            </Field>
            <Field label="שעות פעילות" hint="מופיע בדף צור קשר. ריק = לא מוצג.">
              <input name="hours" defaultValue={v.hours} placeholder="א׳–ה׳ 08:00–17:00" className="field" />
            </Field>
            <Field label="דירוג בגוגל" hint="כפי שגוגל מציג, למשל 4.9">
              <input name="rating" type="number" min={1} max={5} step={0.1} defaultValue={v.rating} required className="field" dir="ltr" />
            </Field>
            <Field label="מספר ביקורות בגוגל">
              <input name="reviewCount" type="number" min={0} step={1} defaultValue={v.reviewCount} required className="field" dir="ltr" />
            </Field>
            <label className="flex items-start gap-3 sm:col-span-2">
              <input type="checkbox" name="floatingConfiguratorCta" defaultChecked={v.floatingConfiguratorCta} className="mt-1 size-5 accent-brand-dark" />
              <span className="text-sm">
                <b>המחסן המרחף</b>
                <span className="block text-ink-soft">מחסן קטן בפינת המסך שמזמין לעצב מחסן בתלת־ממד.</span>
              </span>
            </label>
            <details className="rounded-xl border border-line p-4 sm:col-span-2">
              <summary className="cursor-pointer text-sm font-bold">באנגלית</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="WhatsApp greeting">
                  <input name="en_whatsappGreeting" defaultValue={v.en.whatsappGreeting} className="field" dir="ltr" />
                </Field>
                <Field label="Factory">
                  <input name="en_factory" defaultValue={v.en.factory} className="field" dir="ltr" />
                </Field>
                <Field label="Second address">
                  <input name="en_factory2" defaultValue={v.en.factory2} className="field" dir="ltr" />
                </Field>
                <Field label="Pickup">
                  <input name="en_pickupLocation" defaultValue={v.en.pickupLocation} className="field" dir="ltr" />
                </Field>
                <Field label="Opening hours">
                  <input name="en_hours" defaultValue={v.en.hours} className="field" dir="ltr" />
                </Field>
              </div>
            </details>
          </div>
        </ActionForm>
      </div>
      {saved ? <ResetForm kind="site" /> : null}
    </>
  );
}
