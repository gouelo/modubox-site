import { ActionForm } from "@/components/admin/ContentForms";
import { PageTitle } from "@/components/admin/ui";
import { saveCrawlersAction } from "@/lib/admin/content-actions";
import { requireAdmin } from "@/lib/admin/session";
import robots from "@/app/robots";
import { AI_CRAWLERS } from "@/lib/seo/settings";
import { readSeo } from "@/lib/seo/store";

export const metadata = { title: "סורקי AI" };

/** robots.txt as src/app/robots.ts makes it (before a save shows here, the saved settings are what it reads). */
async function robotsTxt(): Promise<string> {
  const r = await robots();
  const lines: string[] = [];
  for (const rule of [r.rules].flat()) {
    for (const ua of [rule.userAgent ?? "*"].flat()) lines.push(`User-Agent: ${ua}`);
    for (const a of [rule.allow ?? []].flat()) lines.push(`Allow: ${a}`);
    for (const d of [rule.disallow ?? []].flat()) lines.push(`Disallow: ${d}`);
    lines.push("");
  }
  for (const s of [r.sitemap ?? []].flat()) lines.push(`Sitemap: ${s}`);
  return lines.join("\n");
}

/** Which AI crawlers may read the site (robots.txt), and the file itself. */
export default async function CrawlersPage() {
  await requireAdmin("content");
  const { crawlers } = await readSeo();
  return (
    <>
      <PageTitle title="סורקי AI ו־robots.txt" sub="ברירת המחדל: כולם מורשים. חסימה של סורק חיפוש (למשל OAI-SearchBot) מוציאה את האתר מהתשובות של אותו מנוע." />
      <div className="card p-4 sm:p-5">
        <ActionForm action={saveCrawlersAction}>
          <ul className="divide-y divide-line">
            {AI_CRAWLERS.map((c) => (
              <li key={c.agent} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold" dir="ltr">
                    {c.agent}
                  </div>
                  <div className="text-xs text-ink-soft">
                    {c.owner} · {c.use}
                  </div>
                </div>
                <select name={c.agent} defaultValue={crawlers[c.agent] ?? "allow"} className="field w-32 py-2" aria-label={c.agent}>
                  <option value="allow">מורשה</option>
                  <option value="block">חסום</option>
                </select>
              </li>
            ))}
          </ul>
        </ActionForm>
      </div>
      <details className="mt-4" open>
        <summary className="cursor-pointer text-sm font-bold">robots.txt כפי שהוא עכשיו</summary>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-5 text-white" dir="ltr">
          {await robotsTxt()}
        </pre>
      </details>
    </>
  );
}
