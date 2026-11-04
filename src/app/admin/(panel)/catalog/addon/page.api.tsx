import Link from "next/link";
import { getDb } from "@/db";
import { ActionForm, ConfirmForm, Field } from "@/components/admin/ContentForms";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { PageTitle } from "@/components/admin/ui";
import { addonsWith, catalogRows, fileAddons, fileEnAddon, overridesOf } from "@/lib/admin/catalog";
import { discardAddonAction, saveAddonAction } from "@/lib/admin/catalog-actions";
import { requireAdmin } from "@/lib/admin/session";
import type { AddonPatch } from "@/lib/catalog-overrides";

export const metadata = { title: "עריכת תוספת" };

const money = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

export default async function AddonEditor({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireAdmin("catalog");
  const id = (await searchParams).id ?? "";
  const rows = await catalogRows(getDb()!);
  const a = addonsWith(overridesOf(rows, "draft")).find((x) => x.id === id);
  const base = fileAddons().find((x) => x.id === id);
  if (!a || !base) return <PageTitle title="התוספת לא נמצאה" sub={<Link href="/admin/catalog/addons/">חזרה לתוספות</Link>} />;
  const row = rows.addons.find((r) => r.id === id);
  const en = { ...fileEnAddon(id), ...(((row?.draft ?? {}) as AddonPatch).en ?? {}) };
  return (
    <>
      <PageTitle title={a.name} sub={a.group} />
      <div className="card p-4 sm:p-5">
        <ActionForm action={saveAddonAction} submit="שמירת טיוטה" okText="נשמר כטיוטה.">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-5">
            <Field label="שם">
              <input name="name" defaultValue={a.name} required className="field" />
            </Field>
            <Field label="תיאור">
              <textarea name="description" defaultValue={a.description ?? ""} className="field min-h-20" />
            </Field>
            {a.kind !== "choice" ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label="מחיר (₪)" hint={`ריק = בתיאום. היום: ${money(base.price) || "בתיאום"}`}>
                  <input name="price" type="number" min={0} step={1} defaultValue={money(a.price)} className="field" dir="ltr" />
                </Field>
                {a.maxQty !== undefined ? (
                  <Field label="כמות מקסימלית">
                    <input name="maxQty" type="number" min={1} max={20} defaultValue={a.maxQty} className="field" dir="ltr" />
                  </Field>
                ) : null}
              </div>
            ) : null}
            {a.pricePerM2 !== undefined ? (
              <Field label='מחיר למ"ר (₪)' hint={`כל אפשרות חוץ מברירת המחדל עולה מחיר למ"ר × שטח המחסן. היום: ${base.pricePerM2}`}>
                <input name="pricePerM2" type="number" min={0} step={1} defaultValue={a.pricePerM2} required className="field w-40" dir="ltr" />
              </Field>
            ) : null}
            {a.choices ? (
              <fieldset className="grid gap-2">
                <legend className="text-base font-extrabold">אפשרויות</legend>
                {a.choices.map((c) => (
                  <div key={c.id} className="grid grid-cols-[1fr_8rem] gap-2">
                    <input name={`choiceLabel_${c.id}`} defaultValue={c.label} className="field" aria-label={`שם האפשרות ${c.id}`} />
                    {a.pricePerM2 ? (
                      <span className="self-center text-sm text-ink-soft">{c.id === a.default ? "ללא" : 'לפי מ"ר'}</span>
                    ) : (
                      <input name={`choicePrice_${c.id}`} type="number" min={0} step={1} defaultValue={money(c.price)} placeholder="בתיאום" className="field" dir="ltr" aria-label={`מחיר ${c.label}`} />
                    )}
                  </div>
                ))}
              </fieldset>
            ) : null}
            <details className="rounded-xl border border-line p-4">
              <summary className="cursor-pointer text-sm font-bold">באנגלית</summary>
              <div className="mt-4 grid gap-4">
                <Field label="Name">
                  <input name="en_name" defaultValue={en.name ?? ""} className="field" dir="ltr" />
                </Field>
                <Field label="Description">
                  <textarea name="en_description" defaultValue={en.description ?? ""} className="field min-h-20" dir="ltr" />
                </Field>
              </div>
            </details>
          </div>
        </ActionForm>
      </div>
      {row ? (
        <ConfirmForm action={discardAddonAction} confirm={row.published ? "לבטל את הטיוטה ולחזור למה שפורסם?" : "לבטל את השינויים בתוספת?"} className="mt-4">
          <input type="hidden" name="id" value={id} />
          <SubmitButton className="btn-ghost text-rose-700" pendingText="…">
            ביטול השינויים
          </SubmitButton>
        </ConfirmForm>
      ) : null}
    </>
  );
}
