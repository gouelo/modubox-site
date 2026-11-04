import Link from "next/link";
import { ActionForm } from "@/components/admin/ContentForms";
import { PageTitle } from "@/components/admin/ui";
import { importPostsAction } from "@/lib/admin/content-actions";
import { requireAdmin } from "@/lib/admin/session";
import { filePosts, hebrewDate, rowToPost } from "@/lib/blog";
import { readSeo } from "@/lib/seo/store";

export const metadata = { title: "בלוג" };

const STATUS: Record<string, [string, string]> = {
  published: ["מפורסם", "bg-emerald-50 text-emerald-800"],
  draft: ["טיוטה", "bg-amber-100 text-amber-900"],
  hidden: ["מוסתר", "bg-line text-ink-soft"],
};

/** Every post: the files in content/blog and the ones saved here, newest first. */
export default async function BlogList() {
  await requireAdmin("content");
  const { posts: rows } = await readSeo();
  const files = filePosts();
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const all = [
    ...files.map((p) => ({ ...p, status: bySlug.get(p.slug)?.status ?? "published", source: bySlug.has(p.slug) ? "נערך כאן" : "מהקובץ", ...(bySlug.get(p.slug)?.status === "published" ? { title: bySlug.get(p.slug)!.title, date: bySlug.get(p.slug)!.date } : {}) })),
    ...rows.filter((r) => !files.some((f) => f.slug === r.slug)).map((r) => ({ ...rowToPost(r), status: r.status, source: "נכתב כאן" })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const notImported = files.filter((f) => !bySlug.has(f.slug)).length;
  return (
    <>
      <PageTitle
        title="בלוג"
        sub={`${all.filter((p) => p.status === "published").length} מאמרים באתר`}
        action={
          <Link href="/admin/content/blog/edit/" className="btn-brand min-h-11 px-5 text-sm">
            + מאמר חדש
          </Link>
        }
      />
      <ul className="card divide-y divide-line">
        {all.map((p) => (
          <li key={p.slug}>
            <Link href={`/admin/content/blog/edit/?slug=${encodeURIComponent(p.slug)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sand/50">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{p.title}</div>
                <div className="truncate text-xs text-ink-soft">
                  {hebrewDate(p.date)} · {p.source}
                </div>
              </div>
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${STATUS[p.status]?.[1]}`}>{STATUS[p.status]?.[0]}</span>
            </Link>
          </li>
        ))}
      </ul>
      {notImported > 0 ? (
        <section className="card mt-5 p-4 sm:p-5">
          <h2 className="text-base font-extrabold">ייבוא המאמרים לטבלה</h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {notImported} מאמרים עדיין נקראים מהקבצים באתר (content/blog). אפשר לערוך כל אחד גם בלי ייבוא: השמירה הראשונה מעתיקה אותו. הייבוא מעתיק את כולם בבת אחת, והקבצים נשארים כגיבוי.
          </p>
          <ActionForm action={importPostsAction} submit="ייבוא כל המאמרים" />
        </section>
      ) : null}
    </>
  );
}
