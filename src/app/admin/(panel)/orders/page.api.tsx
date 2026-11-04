import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { Empty, NoDatabase, OrderCard, PageTitle } from "@/components/admin/ui";
import { filtersQuery, listOrders, PAGE_SIZE, readFilters, type OrderView } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "הזמנות" };

const VIEWS: { view: OrderView; label: string }[] = [
  { view: "paid", label: "כל ההזמנות" },
  { view: "open", label: "פתוחות" },
  { view: "new", label: "חדשות" },
  { view: "confirmed", label: "אושרו" },
  { view: "in_production", label: "בייצור" },
  { view: "scheduled", label: "מתוזמנות" },
  { view: "completed", label: "הושלמו" },
  { view: "cancelled", label: "בוטלו" },
  { view: "refunded", label: "זוכו" },
  { view: "pending_payment", label: "לא שולמו" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("orders");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const f = readFilters(await searchParams);
  const { rows, total } = await listOrders(db, f);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const dated = !!(f.from || f.to);
  return (
    <>
      <PageTitle
        title="הזמנות"
        sub={total === 1 ? "הזמנה אחת" : `${total} הזמנות`}
        action={
          <a href={`/admin/export/${filtersQuery({ ...f, page: 1 })}`} className="btn-ghost min-h-11 px-4 text-sm">
            ⬇ ייצוא לאקסל (CSV)
          </a>
        }
      />

      <form method="get" className="mb-3 flex gap-2" role="search">
        {f.view !== "paid" ? <input type="hidden" name="view" value={f.view} /> : null}
        {f.from ? <input type="hidden" name="from" value={f.from} /> : null}
        {f.to ? <input type="hidden" name="to" value={f.to} /> : null}
        <label htmlFor="q" className="sr-only">
          חיפוש
        </label>
        <input id="q" name="q" type="search" defaultValue={f.q} placeholder="שם, טלפון, מייל, עיר או מספר הזמנה" className="field min-h-12 flex-1" />
        <button type="submit" className="btn-primary min-h-12 px-5">
          חיפוש
        </button>
      </form>

      <nav aria-label="סינון לפי סטטוס" className="no-scrollbar -mx-4 mb-3 overflow-x-auto px-4">
        <ul className="flex w-max gap-2">
          {VIEWS.map((v) => (
            <li key={v.view}>
              <Link
                href={`/admin/orders/${filtersQuery({ ...f, view: v.view, page: 1 })}`}
                aria-current={f.view === v.view ? "page" : undefined}
                className={`block rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${f.view === v.view ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-ink/30"}`}
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
          {f.view !== "paid" ? <input type="hidden" name="view" value={f.view} /> : null}
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
            <Link href={`/admin/orders/${filtersQuery({ ...f, from: undefined, to: undefined, page: 1 })}`} className="btn-ghost min-h-11 px-4">
              ניקוי
            </Link>
          ) : null}
        </form>
      </details>

      {f.view === "pending_payment" ? <p className="mb-3 text-sm text-ink-soft">לקוחות שעברו לדף התשלום ולא סיימו לשלם. אפשר להתקשר ולעזור להם לסגור.</p> : null}

      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((o) => (
            <OrderCard key={o.id} o={o} />
          ))}
        </ul>
      ) : (
        <Empty>{f.q || dated ? "לא נמצאו הזמנות שמתאימות לחיפוש." : "אין כאן הזמנות כרגע."}</Empty>
      )}

      {pages > 1 ? (
        <nav aria-label="עמודים" className="mt-5 flex items-center justify-center gap-3">
          {f.page > 1 ? (
            <Link href={`/admin/orders/${filtersQuery({ ...f, page: f.page - 1 })}`} className="btn-ghost min-h-11 px-4">
              → הקודם
            </Link>
          ) : null}
          <span className="text-sm text-ink-soft">
            עמוד {f.page} מתוך {pages}
          </span>
          {f.page < pages ? (
            <Link href={`/admin/orders/${filtersQuery({ ...f, page: f.page + 1 })}`} className="btn-ghost min-h-11 px-4">
              הבא ←
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
