import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { Empty, ils, NoDatabase, OrderCard, PageTitle, StatusBadge } from "@/components/admin/ui";
import { ConfirmForm } from "@/components/admin/ContentForms";
import { deleteOrdersAction } from "@/lib/admin/actions";
import { can } from "@/lib/admin/auth";
import { formatDateTime } from "@/lib/admin/time";
import { followUpLink } from "@/lib/admin/follow-up";
import { requestOrigin } from "@/lib/admin/origin";
import { filtersQuery, firstProducts, listOrders, PAGE_SIZE, readFilters, type OrderView } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "הזמנות" };

const VIEWS: { view: OrderView; label: string }[] = [
  { view: "paid", label: "כל ההזמנות" },
  { view: "new", label: "חדשות" },
  { view: "cancelled", label: "בוטלו" },
  { view: "pending_payment", label: "לא שולמו" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireAdmin("orders");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const params = await searchParams;
  const f = readFilters(params);
  // picking orders to delete (the owner only), and how many were just deleted
  const canDelete = can(session, "delete_orders");
  const selecting = canDelete && params.select === "1";
  const deleted = Number(params.deleted);
  const listHref = `/admin/orders/${filtersQuery(f)}`;
  const selectHref = `${listHref}${listHref.includes("?") ? "&" : "?"}select=1`;
  const { rows, total } = await listOrders(db, f);
  // not paid yet: a WhatsApp follow-up under each one
  const unpaid = rows.filter((o) => o.status === "pending_payment" && !o.isTest);
  const [products, origin] = await Promise.all([firstProducts(db, unpaid.map((o) => o.id)), requestOrigin()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const dated = !!(f.from || f.to);
  return (
    <>
      <PageTitle
        title="הזמנות"
        sub={total === 1 ? "הזמנה אחת" : `${total} הזמנות`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/orders/new/" className="btn-brand min-h-11 px-4 text-sm">
              + הזמנה חדשה
            </Link>
            {can(session, "export") ? (
              <a href={`/admin/export/${filtersQuery({ ...f, page: 1 })}`} className="btn-ghost min-h-11 px-4 text-sm">
                ⬇ ייצוא לאקסל (CSV)
              </a>
            ) : null}
          </div>
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

      {deleted > 0 ? <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">✓ {deleted === 1 ? "ההזמנה נמחקה" : `${deleted} הזמנות נמחקו`}.</p> : null}

      {canDelete && rows.length ? (
        <div className="mb-3 flex justify-end">
          <Link href={selecting ? listHref : selectHref} className="text-sm font-semibold text-brand-dark">
            {selecting ? "ביטול הבחירה" : "בחירת הזמנות למחיקה"}
          </Link>
        </div>
      ) : null}

      {f.view === "pending_payment" ? <p className="mb-3 text-sm text-ink-soft">לקוחות שעברו לדף התשלום ולא סיימו לשלם. אפשר להתקשר, או לשלוח הודעת המשך בוואטסאפ: הכפתור פותח וואטסאפ עם הודעה מוכנה, ושולחים רק אחרי שקוראים.</p> : null}

      {selecting && rows.length ? (
        <ConfirmForm action={deleteOrdersAction} confirm="למחוק את ההזמנות שסימנת? לא ניתן לשחזר.">
          <ul className="space-y-2">
            {rows.map((o) => (
              <li key={o.id}>
                <label className="card flex cursor-pointer items-center gap-3 p-4 has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50/50">
                  <input type="checkbox" name="id" value={o.id} className="size-5 shrink-0 accent-rose-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">
                      {o.customerName}
                      {o.isTest ? <span className="ms-2 rounded-full bg-sand px-2 py-0.5 text-xs font-bold text-ink-soft">בדיקה</span> : null}
                    </span>
                    <span className="block truncate text-sm text-ink-soft">
                      #{o.id} · <bdi>{formatDateTime(o.createdAt)}</bdi>
                    </span>
                  </span>
                  <span className="shrink-0 text-[15px] font-extrabold" dir="ltr">
                    {ils(o.total)}
                  </span>
                  <StatusBadge status={o.status} />
                </label>
              </li>
            ))}
          </ul>
          <div className="sticky bottom-20 mt-3 md:bottom-4">
            <button type="submit" className="min-h-12 w-full rounded-full bg-rose-600 px-5 font-bold text-white shadow-lift hover:bg-rose-700">
              🗑 מחיקת ההזמנות שסומנו
            </button>
          </div>
        </ConfirmForm>
      ) : rows.length ? (
        <ul className="space-y-2">
          {rows.map((o) => (
            <OrderCard key={o.id} o={o} followUp={o.status === "pending_payment" && !o.isTest ? followUpLink(o, products.get(o.id), origin) : undefined} />
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
