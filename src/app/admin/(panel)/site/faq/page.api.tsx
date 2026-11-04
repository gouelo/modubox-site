import { getDb } from "@/db";
import { ActionForm, Field } from "@/components/admin/ContentForms";
import { ResetForm } from "@/components/admin/ResetForm";
import { FaqRows } from "@/components/admin/SiteListForms";
import { PageTitle } from "@/components/admin/ui";
import { saveFaqAction } from "@/lib/admin/site-actions";
import { faqForm, savedTexts } from "@/lib/admin/site-texts";
import { requireAdmin } from "@/lib/admin/session";
import type { FaqPatch } from "@/lib/catalog-overrides";

export const dynamic = "force-dynamic";
export const metadata = { title: "שאלות נפוצות" };

/** The FAQ page (/faq/): its questions by group. Photos and links of a question stay as they are. */
export default async function FaqPage() {
  await requireAdmin("site");
  const saved = (await savedTexts(getDb()!)).faq as FaqPatch | undefined;
  const groups = faqForm(saved);
  return (
    <>
      <PageTitle title="שאלות נפוצות" sub="הדף /faq/ באתר. עריכה, סידור, הסתרה ושאלות חדשות. תמונות וקישורים של שאלה קיימת נשארים איתה. שאלות לדף מסוים (בתחתית דף מוצר, למשל): בתוכן ← דפים." />
      <ActionForm action={saveFaqAction} submit="שמירת כל השאלות">
        <div className="grid gap-5">
          {groups.map((g) => (
            <section key={g.id} className="card min-w-0 p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <Field label="כותרת הקבוצה">
                  <input name={`title_${g.id}`} defaultValue={g.title} className="field font-bold" />
                </Field>
                <Field label="Group title (English)">
                  <input name={`enTitle_${g.id}`} defaultValue={g.enTitle} className="field" dir="ltr" />
                </Field>
              </div>
              <FaqRows id={g.id} rows={g.rows} />
            </section>
          ))}
        </div>
      </ActionForm>
      {saved ? <ResetForm kind="faq" /> : null}
    </>
  );
}
