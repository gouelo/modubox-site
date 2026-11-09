import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { LEAD_STATUSES } from "@/db/schema";
import { Empty, LeadCard, NoDatabase, PageTitle } from "@/components/admin/ui";
import { LEAD_STATUS_LABEL, leadFiltersQuery, LEADS_PAGE_SIZE, listAdminLeads, readLeadFilters, type LeadFilters } from "@/lib/admin/leads";
import { can } from "@/lib/admin/auth";
import { requireAdmin } from "@/lib/admin/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "לידים" };

const VIEWS: { status: LeadFilters["status"]; label: string }[] = [{ status: "all", label: "כל הלידים" }, ...LEAD_STATUSES.map((s) => ({ status: s, label: LEAD_STATUS_LABEL[s] }))];

/** Leads from the site's forms: search, status, dates; each opens its own page. */
export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireAdmin("leads");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const params = await searchParams;
  const f = readLeadFilters(params);
  const deleted = params.deleted === "1";
  const { rows, total } = await listAdminLeads(db, f);
  const pages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));
  const dated = !!(f.from || f.to);
  const href = (p: Partial<LeadFilters>) => `/admin/leads/${leadFiltersQuery({ ...f, page: 1, ...p })}`;
  return (
    <>
      <PageTitle
        title="לידים"
        sub={`פניות מהטפסים באתר, החדשות למעלה · ${total === 1 ? "ליד אחד" : `${total} לידים`}`}
        action={
          can(session, "export") ? (
            <a href={`/admin/leads-export/${leadFiltersQuery({ ...f, page: 1 })}`} className="btn-ghost min-h-11 px-4 text-sm">
              ⬇ ייצוא לאקסל (CSV)
            </a>
          ) : undefined
        }
      />

      {deleted ? (
        <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✓ הליד נמחק.
        </p>
      ) : null}

      <form method="get" className="mb-3 flex gap-2" role="search">
        {f.status !== "all" ? <input type="hidden" name="status" value={f.status} /> : null}
        {f.from ? <input type="hidden" name="from" value={f.from} /> : null}
        {f.to ? <input type="hidden" name="to" value={f.to} /> : null}
        <label htmlFor="q" className="sr-only">
          חיפוש ליד
        </label>
        <input id="q" name="q" type="search" defaultValue={f.q} placeholder="שם, טלפון, מייל, עיר, מוצר או הודעה" className="field min-h-12 flex-1" />
        <button type="submit" className="btn-primary min-h-12 px-5">
          חיפוש
        </button>
      </form>

      <nav aria-label="סינון לפי סטטוס" className="no-scrollbar -mx-4 mb-3 overflow-x-auto px-4">
        <ul className="flex w-max gap-2">
          {VIEWS.map((v) => (
            <li key={v.status}>
              <Link
                href={href({ status: v.status })}
                aria-current={f.status === v.status ? "page" : undefined}
                className={`block rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${f.status === v.status ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-ink/30"}`}
              >
                {v.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <details className="mb-4" open={dated}>
        <summary className="cursor-pointer text-sm font-semibold text-brand-dark">סינון לפי תאריך{dated ? `: ${f.from ?? "…"} – ${f.to ?? "…"}` : ""}</summary>
        <form method="get" className="mt-2 flex flex-wrap items-end gap-2">
          {f.status !== "all" ? <input type="hidden" name="status" value={f.status} /> : null}
          {f.q ? <input type="hidden" name="q" value={f.q} /> : null}
          <label className="text-sm">
            <span className="mb-1 block font-semibold">מתאריך</span>
            <input type="date" name="from" defaultValue={f.from} className="field min-h-11" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">עד תאריך</span>
            <input type="date" name="to" defaultValue={f.to} className="field min-h-11" />
          </label>
          <button type="submit" className="btn-primary min-h-11 px-5">
            הצגה
          </button>
          {dated ? (
            <Link href={href({ from: undefined, to: undefined })} className="btn-ghost min-h-11 px-4">
              ניקוי
            </Link>
          ) : null}
        </form>
      </details>

      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((l) => (
            <LeadCard key={l.id} l={l} />
          ))}
        </ul>
      ) : (
        <Empty>{f.q || dated || f.status !== "all" ? "לא נמצאו לידים שמתאימים לסינון." : "עוד אין לידים."}</Empty>
      )}

      {pages > 1 ? (
        <nav aria-label="עמודים" className="mt-5 flex items-center justify-center gap-3">
          {f.page > 1 ? (
            <Link href={href({ page: f.page - 1 })} className="btn-ghost min-h-11 px-4">
              → הקודם
            </Link>
          ) : null}
          <span className="text-sm text-ink-soft">
            עמוד {f.page} מתוך {pages}
          </span>
          {f.page < pages ? (
            <Link href={href({ page: f.page + 1 })} className="btn-ghost min-h-11 px-4">
              הבא ←
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
