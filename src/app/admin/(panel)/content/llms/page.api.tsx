import { ActionForm, Field } from "@/components/admin/ContentForms";
import { PageTitle } from "@/components/admin/ui";
import { saveLlmsAction } from "@/lib/admin/content-actions";
import { requireAdmin } from "@/lib/admin/session";
import { llmsText } from "@/lib/seo/llms";
import { readSeo } from "@/lib/seo/store";

export const metadata = { title: "llms.txt" };

/** /llms.txt: generated from the catalog, with an opening and sections of the admin's own. */
export default async function LlmsPage() {
  await requireAdmin("content");
  const seo = await readSeo();
  return (
    <>
      <PageTitle
        title="llms.txt"
        sub={
          <>
            מדריך קצר לאתר בשביל מנועי AI (ChatGPT, Claude, Perplexity). המוצרים, המחירים והשאלות נכנסים אליו לבד מהקטלוג. <a href="/llms.txt" target="_blank" rel="noopener" className="underline">llms.txt ↗</a> · <a href="/llms-full.txt" target="_blank" rel="noopener" className="underline">llms-full.txt ↗</a>
          </>
        }
      />
      <div className="card p-4 sm:p-5">
        <ActionForm action={saveLlmsAction}>
          <div className="grid gap-4">
            <Field label="פתיח" hint="משפט־שניים: מי אתם, מה אתם מוכרים, למי. ריק = התיאור הקבוע של האתר.">
              <textarea name="intro" defaultValue={seo.llms.intro ?? ""} className="field min-h-24" />
            </Field>
            <Field label="תוספות (Markdown)" hint="מקטעים משלכם בסוף הקובץ, למשל ## למה לבחור בנו, ## אזורי שירות, ## מה לא כלול.">
              <textarea name="extra" defaultValue={seo.llms.extra ?? ""} className="field min-h-48 font-mono text-sm" />
            </Field>
          </div>
        </ActionForm>
      </div>
      <details className="mt-4" open>
        <summary className="cursor-pointer text-sm font-bold">הקובץ כפי שנשמר עכשיו</summary>
        <pre className="mt-2 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl bg-ink p-4 text-xs leading-5 text-white">{llmsText(seo)}</pre>
      </details>
    </>
  );
}
