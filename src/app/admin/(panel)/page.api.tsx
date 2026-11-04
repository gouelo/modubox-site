import Link from "next/link";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { Empty, ils, NoDatabase, OrderCard, PageTitle } from "@/components/admin/ui";
import { followUpLink } from "@/lib/admin/follow-up";
import { requestOrigin } from "@/lib/admin/origin";
import { dashboard, firstProducts } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub, href, tone = "" }: { label: string; value: string; sub?: string; href?: string; tone?: string }) {
  const body = (
    <>
      <div className="text-sm font-semibold text-ink-soft">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold sm:text-3xl ${tone}`} dir="ltr">
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-ink-soft">{sub}</div> : null}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-4 transition hover:border-brand/40 hover:shadow-lift active:scale-[0.99]">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

export default async function DashboardPage() {
  await requireAdmin("orders");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const d = await dashboard(db);
  const [products, origin] = await Promise.all([firstProducts(db, d.abandonedRecent.map((o) => o.id)), requestOrigin()]);
  const orders = (n: number) => (n === 1 ? "הזמנה אחת" : `${n} הזמנות`);
  return (
    <>
      <PageTitle title="שלום 👋" sub="מה קורה בחנות היום" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="מכירות היום" value={ils(d.today.amount)} sub={orders(d.today.orders)} />
        <Stat label="מכירות החודש" value={ils(d.month.amount)} sub={orders(d.month.orders)} />
        <Stat label="הזמנות חדשות" value={String(d.newOrders)} sub="ב־7 הימים האחרונים" href="/admin/orders/?view=new" tone={d.newOrders ? "text-copper-deep" : ""} />
      </div>

      {d.abandoned > 0 ? (
        <section className="mt-3 rounded-xl2 border border-copper/30 bg-copper-tint p-4">
          <Link href="/admin/orders/?view=pending_payment" className="flex items-center justify-between gap-3 text-copper-deep">
            <span className="text-[15px] font-semibold">
              {d.abandoned === 1 ? "לקוח אחד התחיל לשלם ולא סיים" : `${d.abandoned} לקוחות התחילו לשלם ולא סיימו`} השבוע. שווה לפנות.
            </span>
            <span aria-hidden>←</span>
          </Link>
          <ul className="mt-3 space-y-2">
            {d.abandonedRecent.map((o) => (
              <OrderCard key={o.id} o={o} followUp={followUpLink(o, products.get(o.id), origin)} />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-5">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold tracking-normal">הזמנות אחרונות</h2>
            <Link href="/admin/orders/" className="text-sm font-semibold text-brand-dark">
              כל ההזמנות
            </Link>
          </div>
          {d.recent.length ? (
            <ul className="space-y-2">
              {d.recent.map((o) => (
                <OrderCard key={o.id} o={o} />
              ))}
            </ul>
          ) : (
            <Empty>עוד אין הזמנות. כשלקוח ישלם באתר, ההזמנה תופיע כאן ותגיע אליכם במייל.</Empty>
          )}
        </div>
      </div>
    </>
  );
}
