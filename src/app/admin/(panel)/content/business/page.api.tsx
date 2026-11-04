import { ActionForm, Field } from "@/components/admin/ContentForms";
import { PageTitle } from "@/components/admin/ui";
import { saveBusinessAction } from "@/lib/admin/content-actions";
import { requireAdmin } from "@/lib/admin/session";
import { business, defaultBusiness, orgJsonLd, type Business } from "@/lib/seo/settings";
import { readSeo } from "@/lib/seo/store";

export const metadata = { title: "פרטי העסק" };

const FIELDS: { key: keyof Business; label: string; hint?: string; ltr?: boolean }[] = [
  { key: "name", label: "שם העסק" },
  { key: "legalName", label: "שם רשמי (חברה)", hint: "כמו ברשם החברות." },
  { key: "description", label: "תיאור קצר" },
  { key: "phone", label: "טלפון", ltr: true },
  { key: "email", label: "מייל", ltr: true },
  { key: "streetAddress", label: "כתובת" },
  { key: "city", label: "יישוב" },
  { key: "postalCode", label: "מיקוד", ltr: true },
  { key: "geo", label: "קואורדינטות", hint: "קו רוחב, קו אורך. למשל 32.5546,35.3945", ltr: true },
  { key: "areaServed", label: "אזור שירות", hint: "למשל: כל הארץ" },
  { key: "priceRange", label: "טווח מחירים", hint: "למשל: ₪₪ או 5,000–60,000 ₪" },
  { key: "foundingYear", label: "שנת הקמה", ltr: true },
];

/** The business as Google and AI assistants read it (Organization / LocalBusiness JSON-LD on every page). */
export default async function BusinessPage() {
  await requireAdmin("content");
  const saved = (await readSeo()).business;
  const d = defaultBusiness();
  const b = business(saved);
  const val = (k: keyof Business) => (saved[k] !== undefined && saved[k] !== "" ? String(saved[k]) : "");
  return (
    <>
      <PageTitle title="פרטי העסק" sub="מופיעים בנתונים המובנים של כל דף באתר. שדה ריק = מה שמופיע היום באתר (data/site.json)." />
      <div className="card p-4 sm:p-5">
        <ActionForm action={saveBusinessAction}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <input name={f.key} defaultValue={val(f.key)} placeholder={String(d[f.key] ?? "")} className="field" dir={f.ltr ? "ltr" : undefined} />
              </Field>
            ))}
            <Field label="דירוג בגוגל" hint={`היום: ${d.rating}`}>
              <input name="rating" type="number" step="0.1" min="1" max="5" defaultValue={saved.rating ?? ""} placeholder={String(d.rating)} className="field" dir="ltr" />
            </Field>
            <Field label="מספר ביקורות" hint={`היום: ${d.reviewCount}`}>
              <input name="reviewCount" type="number" min="1" defaultValue={saved.reviewCount ?? ""} placeholder={String(d.reviewCount)} className="field" dir="ltr" />
            </Field>
            <Field label="שעות פעילות" hint="שורה לכל טווח, בפורמט schema.org: Su-Th 08:00-17:00">
              <textarea name="openingHours" defaultValue={(saved.openingHours ?? []).join("\n")} className="field min-h-24" dir="ltr" placeholder={"Su-Th 08:00-17:00\nFr 08:00-12:00"} />
            </Field>
            <Field label="פרופילים ברשת" hint="כתובת בכל שורה: פייסבוק, אינסטגרם, יוטיוב, כרטיס גוגל…">
              <textarea name="sameAs" defaultValue={(saved.sameAs ?? []).join("\n")} className="field min-h-24" dir="ltr" placeholder={d.sameAs.join("\n")} />
            </Field>
          </div>
        </ActionForm>
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-bold">הנתונים המובנים כפי שיופיעו באתר</summary>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-5 text-white" dir="ltr">
          {JSON.stringify(orgJsonLd(b, "he"), null, 2)}
        </pre>
      </details>
    </>
  );
}
