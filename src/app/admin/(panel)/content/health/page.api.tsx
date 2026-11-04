import Link from "next/link";
import { headers } from "next/headers";
import { PageTitle, Section } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";
import { analyzeHtml, type Health, type Level } from "@/lib/seo/health";
import { normalizePath } from "@/lib/seo/meta";
import { sitePages } from "@/lib/seo/pages";

export const metadata = { title: "בדיקת דף" };

const ICON: Record<Level, [string, string]> = { ok: ["✓", "text-emerald-700"], warn: ["!", "text-amber-700"], bad: ["✕", "text-rose-700"] };

/** A live page's SEO and AI-readiness, from its HTML on this deployment. */
export default async function HealthPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  await requireAdmin("content");
  const raw = (await searchParams).path;
  const pages = await sitePages();
  let result: Health | null = null;
  let error = "";
  const path = raw ? normalizePath(raw) : "";
  if (path && !pages.some((p) => p.path === path)) error = "דף לא ידוע.";
  else if (path) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const url = `${proto}://${host}${encodeURI(path)}`;
    try {
      const res = await fetch(url, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(10_000), headers: { "user-agent": "ModuboxAdminHealth/1.0" } });
      if (!res.ok) error = `הדף ענה ${res.status}.`;
      else result = analyzeHtml(await res.text(), url);
    } catch (e) {
      error = `לא הצלחתי לטעון את הדף (${e instanceof Error ? e.message : "שגיאה"}).`;
    }
  }
  return (
    <>
      <PageTitle title="בדיקת דף" sub="בודק את הדף החי כמו שמנוע חיפוש או AI רואים אותו." />
      <form className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="path" className="sr-only">
          דף
        </label>
        <select id="path" name="path" defaultValue={path} className="field flex-1">
          <option value="" disabled>
            בחרו דף…
          </option>
          {pages.map((p) => (
            <option key={p.path} value={p.path}>
              {p.label} ({decodeURI(p.path)})
            </option>
          ))}
        </select>
        <button className="btn-brand min-h-12 px-6">בדיקה</button>
      </form>
      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
      {result ? (
        <Section
          className="mt-5"
          title={`ציון: ${result.score}/100`}
          action={
            <Link href={`/admin/content/page/?path=${encodeURIComponent(path)}`} className="text-sm font-semibold text-brand-dark">
              לעריכת הדף ←
            </Link>
          }
        >
          <ul className="divide-y divide-line">
            {result.checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3 py-2.5">
                <span className={`mt-0.5 w-4 shrink-0 text-center font-extrabold ${ICON[c.level][1]}`} aria-hidden>
                  {ICON[c.level][0]}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold">{c.label}</div>
                  <div className="break-words text-sm text-ink-soft">{c.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
