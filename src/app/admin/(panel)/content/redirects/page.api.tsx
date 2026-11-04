import Link from "next/link";
import { getDb } from "@/db";
import { redirects } from "@/db/schema";
import { ActionForm, ConfirmForm, Field } from "@/components/admin/ContentForms";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { PageTitle, Section } from "@/components/admin/ui";
import { deleteRedirectAction, importRedirectsAction, saveRedirectAction } from "@/lib/admin/content-actions";
import { requireAdmin } from "@/lib/admin/session";
import { compileRules, fileRules, findRedirect, mergeRules, normalizeSource, ruleWarnings, type RedirectRule } from "@/lib/seo/redirects";

export const metadata = { title: "הפניות" };

function RuleFields({ rule }: { rule?: RedirectRule }) {
  return (
    <div className="grid gap-4">
      <input type="hidden" name="id" value={rule?.id ?? ""} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="מכתובת" hint={<>למשל <bdi dir="ltr">/old-page</bdi>, או <bdi dir="ltr">/post/:slug*</bdi> לכל מה שמתחת.</>}>
          <input name="source" defaultValue={rule?.source ?? ""} required readOnly={!!rule && !rule.id} className="field read-only:bg-sand/60" dir="ltr" />
        </Field>
        <Field label="אל" hint={<>דף באתר (<bdi dir="ltr">/shop/</bdi>) או כתובת מלאה.</>}>
          <input name="destination" defaultValue={rule?.destination ?? ""} required className="field" dir="ltr" />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="סוג">
          <select name="statusCode" defaultValue={rule?.statusCode ?? 301} className="field">
            <option value={301}>301 קבועה</option>
            <option value={302}>302 זמנית</option>
          </select>
        </Field>
        <Field label="הערה">
          <input name="note" defaultValue={rule?.note ?? ""} className="field" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" name="enabled" defaultChecked={rule?.enabled ?? true} className="size-5 accent-brand-dark" /> פעילה
      </label>
    </div>
  );
}

/** The redirects: the old site's (data/redirects.json) and the ones added here, with a tester. */
export default async function RedirectsPage({ searchParams }: { searchParams: Promise<{ q?: string; test?: string; edit?: string; show?: string }> }) {
  await requireAdmin("content");
  const { q = "", test = "", edit, show = "" } = await searchParams;
  const db = getDb();
  const rows = db ? await db.select().from(redirects).catch(() => []) : [];
  const rules = mergeRules(fileRules(), rows);
  const warnings = ruleWarnings(rules);
  const compiled = compileRules(rules);
  const hit = test ? findRedirect(compiled, encodeURI(normalizeSource(test))) : null;
  const editing = edit !== undefined ? rules.find((r) => r.source === normalizeSource(edit)) : undefined;
  const needle = q.trim().toLowerCase();
  const shown = rules.filter((r) => (!needle || `${r.source} ${r.destination} ${r.note ?? ""}`.toLowerCase().includes(needle)) && (show === "admin" ? r.origin === "admin" : show === "off" ? !r.enabled : show === "warn" ? warnings.has(r.source) : true));
  const fileOnly = rules.filter((r) => r.origin === "file").length;
  return (
    <>
      <PageTitle title="הפניות 301" sub={`${rules.filter((r) => r.enabled).length} פעילות. שינוי נכנס לתוקף תוך דקה.`} />

      <Section title="בדיקת כתובת">
        <form className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="test" className="sr-only">
            כתובת לבדיקה
          </label>
          <input id="test" name="test" defaultValue={test} placeholder="/product-page/…" className="field flex-1" dir="ltr" />
          <button className="btn-ghost min-h-12 px-5">בדיקה</button>
        </form>
        {test ? (
          <p className="mt-3 text-sm" role="status">
            {hit ? (
              <>
                <b>{hit.status}</b> אל <bdi dir="ltr">{decodeURIComponent(hit.location)}</bdi> <span className="text-ink-soft">(לפי <bdi dir="ltr">{hit.rule.source}</bdi>)</span>
              </>
            ) : (
              "אין הפניה לכתובת הזו: הדף נטען כרגיל (או 404)."
            )}
          </p>
        ) : null}
      </Section>

      <Section title={editing ? `עריכה: ${editing.source}` : "הפניה חדשה"} className="mt-4" action={editing ? <Link href="/admin/content/redirects/" className="text-sm text-brand-dark">ביטול</Link> : undefined}>
        <ActionForm action={saveRedirectAction} key={editing?.source ?? "new"} okText="נשמר. ההפניה פעילה תוך דקה.">
          <RuleFields rule={editing} />
        </ActionForm>
      </Section>

      <form className="mt-6 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="q" className="sr-only">
          חיפוש
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="חיפוש בהפניות" className="field flex-1" />
        <select name="show" defaultValue={show} className="field sm:w-48" aria-label="סינון">
          <option value="">הכל</option>
          <option value="admin">שנערכו כאן</option>
          <option value="off">כבויות</option>
          <option value="warn">עם אזהרות</option>
        </select>
        <button className="btn-ghost min-h-12 px-5">סינון</button>
      </form>
      <p className="mt-2 text-xs text-ink-soft">
        {shown.length} מתוך {rules.length}
      </p>
      <ul className="card mt-2 divide-y divide-line">
        {shown.map((r) => (
          <li key={r.source} className={`px-4 py-3 ${r.enabled ? "" : "opacity-50"}`}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 text-sm">
                <div className="break-all font-semibold" dir="ltr">
                  {r.source}
                </div>
                <div className="break-all text-ink-soft" dir="ltr">
                  → {r.destination} {r.statusCode !== 301 ? `(${r.statusCode})` : ""}
                </div>
                {r.note ? <div className="text-xs text-ink-soft">{r.note}</div> : null}
                {warnings.get(r.source)?.map((w) => (
                  <div key={w} className="mt-1 text-xs font-semibold text-amber-800">
                    ⚠ {w}
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.origin === "admin" ? "bg-emerald-50 text-emerald-800" : "bg-sand text-ink-soft"}`}>{r.origin === "admin" ? "טבלה" : "קובץ"}</span>
                <Link href={`/admin/content/redirects/?edit=${encodeURIComponent(r.source)}`} className="text-xs font-semibold text-brand-dark hover:underline">
                  עריכה
                </Link>
                {r.id ? (
                  <ConfirmForm action={deleteRedirectAction} confirm={fileRules().some((f) => f.source === r.source) ? "למחוק את השינוי ולחזור להפניה המקורית מהקובץ?" : "למחוק את ההפניה?"}>
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton className="min-h-0 text-xs font-semibold text-rose-700 hover:underline" pendingText="…">
                      מחיקה
                    </SubmitButton>
                  </ConfirmForm>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {fileOnly > 0 && db ? (
        <Section title="ייבוא לטבלה" className="mt-5">
          <p className="text-sm leading-6 text-ink-soft">{fileOnly} הפניות נקראות מהקובץ data/redirects.json. אפשר לערוך כל אחת גם בלי ייבוא. הייבוא מעתיק את כולן לטבלה; הקובץ נשאר כגיבוי אם מסד הנתונים לא זמין.</p>
          <ActionForm action={importRedirectsAction} submit="ייבוא כל ההפניות" />
        </Section>
      ) : null}
    </>
  );
}
