import Link from "next/link";
import { getDb } from "@/db";
import { ImagesField } from "@/components/admin/CatalogForms";
import { ActionForm, ConfirmForm, Field } from "@/components/admin/ContentForms";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { PageTitle, Section } from "@/components/admin/ui";
import { catalogRows, fileAddons, fileEnProduct, fileProducts, overridesOf, productsWith } from "@/lib/admin/catalog";
import { copyProductAction, discardProductAction, saveProductAction } from "@/lib/admin/catalog-actions";
import { missingInfo } from "@/lib/admin/missing-info";
import { requireAdmin } from "@/lib/admin/session";
import { uploadsEnabled } from "@/lib/admin/uploads";
import { ltrSizes, plain } from "@/lib/catalog";
import type { ProductPatch } from "@/lib/catalog-overrides";

export const metadata = { title: "עריכת מוצר" };

const money = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

/** One product: price, texts, photos, delivery and installation, add-ons. */
export default async function ProductEditor({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  await requireAdmin("catalog");
  const slug = (await searchParams).slug ?? "";
  const rows = await catalogRows(getDb()!);
  const all = productsWith(overridesOf(rows, "draft"));
  const p = all.find((x) => x.slug === slug);
  if (!p) return <PageTitle title="המוצר לא נמצא" sub={<Link href="/admin/catalog/">חזרה לקטלוג</Link>} />;
  const row = rows.products.find((r) => r.slug === slug);
  const draft = (row?.draft ?? {}) as ProductPatch;
  const base = fileProducts().find((x) => x.slug === (p.copiedFrom ?? slug))!;
  const en = { ...fileEnProduct(p.copiedFrom ? "" : slug), ...(draft.en ?? {}) };
  const f = p.fulfillment;
  const missing = missingInfo(p, all);
  const addons = fileAddons();
  const fulfillment: [string, string, number | null, string][] = [
    ["f_deliveryAndInstallation", "הובלה + התקנה", f.deliveryAndInstallation, `ברירת מחדל: ${money(base.fulfillment.deliveryAndInstallation) || "לא מוצע"}`],
    ["f_delivery", "הובלה בלבד", f.delivery, `ברירת מחדל: ${money(base.fulfillment.delivery) || "לא מוצע"}`],
    ["f_installation", "התקנה בלבד", f.installation, `ברירת מחדל: ${money(base.fulfillment.installation) || "לא מוצע"}`],
    ["f_pickup", "איסוף עצמי", f.pickup, `ברירת מחדל: ${money(base.fulfillment.pickup) || "לא מוצע"}`],
  ];
  return (
    <>
      <PageTitle
        title={ltrSizes(plain(p.name))}
        sub={
          p.copiedFrom ? (
            <>מוצר חדש (העתק של {base.slug}). יופיע באתר אחרי פרסום.</>
          ) : (
            <a href={`/product/${slug}/`} target="_blank" rel="noopener" className="hover:underline">
              לדף המוצר באתר ↗
            </a>
          )
        }
      />
      {missing.length ? (
        <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="font-bold">חסר מידע (מופיע רק כאן, לא באתר)</p>
          <ul className="mt-1 list-disc ps-5">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="card p-4 sm:p-5">
        <ActionForm action={saveProductAction} submit="שמירת טיוטה" okText="נשמר כטיוטה.">
          <input type="hidden" name="slug" value={slug} />
          <div className="grid gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_12rem]">
              <Field label="שם המוצר">
                <input name="name" defaultValue={plain(p.name)} required className="field" />
              </Field>
              <Field label="מחיר (₪, כולל מע״מ)" hint={base.price !== p.price ? `היום באתר: ${base.price.toLocaleString("he-IL")} ₪` : undefined}>
                <input name="price" type="number" min={1} step={1} defaultValue={p.price} required className="field text-lg font-extrabold" dir="ltr" />
              </Field>
            </div>
            {p.copiedFrom ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="מידה (תווית)">
                  <input name="sizeLabel" defaultValue={plain(p.sizeLabel)} required className="field" dir="ltr" />
                </Field>
                <Field label="רוחב (מ')">
                  <input name="widthM" type="number" step="0.01" defaultValue={p.widthM} required className="field" dir="ltr" />
                </Field>
                <Field label="עומק (מ')">
                  <input name="depthM" type="number" step="0.01" defaultValue={p.depthM} required className="field" dir="ltr" />
                </Field>
                <Field label='שטח (מ"ר)'>
                  <input name="areaM2" type="number" step="0.01" defaultValue={p.areaM2} required className="field" dir="ltr" />
                </Field>
              </div>
            ) : null}
            <Field label="תיאור קצר">
              <textarea name="shortDescription" defaultValue={p.shortDescription} className="field min-h-24" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="תגית" hint="למשל “הכי נמכר”. ריק = בלי תגית.">
                <input name="badge" defaultValue={p.badge ?? ""} className="field" />
              </Field>
              <Field label="שנות אחריות">
                <input name="warrantyYears" type="number" min={0} max={50} defaultValue={p.warrantyYears} required className="field" dir="ltr" />
              </Field>
            </div>

            <fieldset className="grid gap-3">
              <legend className="text-base font-extrabold">תמונות</legend>
              <ImagesField name="images" initial={p.images} uploads={uploadsEnabled()} />
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="text-base font-extrabold">הובלה והתקנה</legend>
              <p className="text-sm text-ink-soft">מחיר בשקלים. 0 = כלול במחיר. ריק = האפשרות לא מוצעת.</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {fulfillment.map(([name, label, value, hint]) => (
                  <Field key={name} label={label} hint={hint}>
                    <input name={name} type="number" min={0} step={1} defaultValue={money(value)} className="field" dir="ltr" />
                  </Field>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="payToInstaller" defaultChecked={!!f.payToInstaller} className="size-5 accent-brand-dark" /> משולם למתקין ביום ההתקנה (לא באתר)
              </label>
              <Field label="הערה להובלה">
                <textarea name="note" defaultValue={f.note ?? ""} className="field min-h-20" />
              </Field>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="text-base font-extrabold">תוספות</legend>
              <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" name="configurable" defaultChecked={p.configurable} className="size-5 accent-brand-dark" /> בונה התוספות מופעל בדף המוצר
              </label>
              <p className="text-sm text-ink-soft">מחיר למוצר הזה: ריק = המחיר הרגיל של התוספת.</p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {addons.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                      <input type="checkbox" name={`addon_${a.id}`} defaultChecked={p.addons.includes(a.id)} className="size-5 shrink-0 accent-brand-dark" />
                      <span className="truncate">{a.name}</span>
                    </label>
                    {a.kind !== "choice" && !a.pricePerM2 ? (
                      <input name={`addonPrice_${a.id}`} type="number" min={0} step={1} defaultValue={money(p.addonPriceOverrides[a.id])} placeholder={money(a.price) || "בתיאום"} className="field w-28 py-2 text-sm" dir="ltr" aria-label={`מחיר ${a.name} למוצר הזה`} />
                    ) : null}
                  </li>
                ))}
              </ul>
            </fieldset>

            <details className="rounded-xl border border-line p-4">
              <summary className="cursor-pointer text-sm font-bold">באנגלית (האתר באנגלית)</summary>
              <div className="mt-4 grid gap-4">
                <Field label="Name">
                  <input name="en_name" defaultValue={en.name ?? ""} className="field" dir="ltr" />
                </Field>
                <Field label="Short description">
                  <textarea name="en_shortDescription" defaultValue={en.shortDescription ?? ""} className="field min-h-20" dir="ltr" />
                </Field>
                <Field label="Badge">
                  <input name="en_badge" defaultValue={en.badge ?? ""} className="field" dir="ltr" />
                </Field>
              </div>
            </details>

            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="hidden" defaultChecked={!!p.hidden} className="mt-1 size-5 accent-brand-dark" />
              <span>
                <b>הסתרת המוצר מהאתר</b>
                <br />
                <span className="text-ink-soft">יוצא מהקטלוג ומהדפים, ואי אפשר לקנות אותו.</span>
              </span>
            </label>
          </div>
        </ActionForm>
      </div>

      {row ? (
        <ConfirmForm action={discardProductAction} confirm={row.published ? "לבטל את הטיוטה ולחזור למה שפורסם?" : p.copiedFrom ? "למחוק את המוצר החדש?" : "לבטל את כל השינויים במוצר?"} className="mt-4">
          <input type="hidden" name="slug" value={slug} />
          <SubmitButton className="btn-ghost text-rose-700" pendingText="…">
            {row.published ? "ביטול הטיוטה" : p.copiedFrom ? "מחיקת המוצר החדש" : "ביטול השינויים"}
          </SubmitButton>
        </ConfirmForm>
      ) : null}

      {!p.copiedFrom ? (
        <Section title="מוצר חדש על בסיס המוצר הזה" className="mt-6">
          <p className="mb-3 text-sm text-ink-soft">מעתיק את כל הפרטים (מידות, תוספות, הובלה ותמונות) למוצר חדש, שתוכלו לשנות לפני הפרסום.</p>
          <ActionForm action={copyProductAction} submit="יצירת העתק">
            <input type="hidden" name="from" value={slug} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="כתובת (באנגלית)" hint="למשל modubox-6x3. אי אפשר לשנות אחר כך.">
                <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className="field" dir="ltr" />
              </Field>
              <Field label="שם">
                <input name="name" required className="field" />
              </Field>
            </div>
          </ActionForm>
        </Section>
      ) : null}
    </>
  );
}
