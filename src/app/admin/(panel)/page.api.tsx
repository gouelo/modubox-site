import Link from "next/link";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin/session";
import { Empty, ils, LeadCard, NoDatabase, OrderCard, PageTitle } from "@/components/admin/ui";
import { followUpLink } from "@/lib/admin/follow-up";
import { requestOrigin } from "@/lib/admin/origin";
import { dashboard, firstProducts } from "@/lib/admin/queries";
import { countNewLeads, recentLeads } from "@/lib/admin/leads";
import { visitorsSummary } from "@/lib/admin/stats";
import { can, type AdminSession, type Permission } from "@/lib/admin/auth";

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

/** The shortcuts on the home page, each shown to whoever may open it. */
const QUICK: { href: string; label: string; perm: Permission }[] = [
  { href: "/admin/orders/new/", label: "+ הזמנה טלפונית", perm: "orders" },
  { href: "/admin/leads/", label: "לידים", perm: "leads" },
  { href: "/admin/customers/", label: "לקוחות", perm: "customers" },
  { href: "/admin/coupons/", label: "קופונים", perm: "coupons" },
  { href: "/admin/stats/", label: "נתונים", perm: "stats" },
  { href: "/admin/catalog/", label: "קטלוג ומחירים", perm: "catalog" },
  { href: "/admin/site/", label: "מבצע, שאלות וביקורות", perm: "site" },
  { href: "/admin/content/", label: "תוכן ו־SEO", perm: "content" },
];

/**
 * The home page (round 17): everything at a glance. The owner sees sales,
 * orders, leads and visitors; the sales team (no `stats`) sees their version:
 * order counts rather than revenue, the leads waiting for them, no visitors.
 */
export default async function DashboardPage() {
  const session = await requireAdmin("orders");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const owner = can(session, "stats");
  const leadsToo = can(session, "leads");
  const d = await dashboard(db);
  const [products, origin, newLeads, workingLeads, latestLeads, visitors] = await Promise.all([
    firstProducts(db, d.abandonedRecent.map((o) => o.id)),
    requestOrigin(),
    leadsToo ? countNewLeads(db) : null,
    leadsToo ? countNewLeads(db, "in_progress") : null,
    leadsToo ? recentLeads(db, 5) : [],
    owner ? visitorsSummary(db) : null,
  ]);
  const orders = (n: number) => (n === 1 ? "הזמנה אחת" : `${n} הזמנות`);
  const quick = QUICK.filter((q) => can(session, q.perm));
  return (
    <>
      <PageTitle title={greeting(session)} sub={owner ? "כל מה שקורה בחנות, במבט אחד" : "ההזמנות והלידים שמחכים לכם"} />
      <div className={`grid grid-cols-2 gap-3 ${owner ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {owner ? (
          <>
            <Stat label="מכירות היום" value={ils(d.today.amount)} sub={orders(d.today.orders)} />
            <Stat label="מכירות החודש" value={ils(d.month.amount)} sub={orders(d.month.orders)} />
          </>
        ) : (
          <Stat label="הזמנות היום" value={String(d.today.orders)} sub={`החודש: ${orders(d.month.orders)}`} />
        )}
        <Stat label="הזמנות חדשות" value={String(d.newOrders)} sub="ב־7 הימים האחרונים" href="/admin/orders/?view=new" tone={d.newOrders ? "text-copper-deep" : ""} />
        {newLeads !== null ? <Stat label="לידים חדשים" value={String(newLeads)} sub="עוד לא טופלו" href="/admin/leads/?status=new" tone={newLeads ? "text-copper-deep" : ""} /> : null}
        {workingLeads !== null ? <Stat label="לידים בטיפול" value={String(workingLeads)} sub="שווה לחזור אליהם" href="/admin/leads/?status=in_progress" /> : null}
        {visitors ? (
          <Stat label="מבקרים היום" value={visitors.today.toLocaleString("he-IL")} sub={`${visitors.week.toLocaleString("he-IL")} ב־7 הימים האחרונים`} href="/admin/stats/?days=1" />
        ) : null}
      </div>

      <nav aria-label="קיצורי דרך" className="mt-3">
        <ul className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <li key={q.href}>
              <Link href={q.href} className={`block rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${q.href.endsWith("/new/") ? "bg-brand-dark text-white ring-brand-dark hover:bg-[#05615f]" : "bg-white text-ink ring-line hover:ring-ink/30"}`}>
                {q.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {d.abandoned > 0 ? (
        <section className="mt-4 rounded-xl2 border border-copper/30 bg-copper-tint p-4">
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

      <div className={`mt-5 grid grid-cols-1 gap-5 ${leadsToo ? "lg:grid-cols-2" : ""}`}>
        <section className="min-w-0">
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
        </section>
        {leadsToo ? (
          <section className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold tracking-normal">לידים אחרונים</h2>
              <Link href="/admin/leads/" className="text-sm font-semibold text-brand-dark">
                כל הלידים
              </Link>
            </div>
            {latestLeads.length ? (
              <ul className="space-y-2">
                {latestLeads.map((l) => (
                  <LeadCard key={l.id} l={l} />
                ))}
              </ul>
            ) : (
              <Empty>עוד אין לידים. פניות מהטפסים באתר יופיעו כאן.</Empty>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}

function greeting(s: AdminSession): string {
  return s.role === "sales" ? "שלום צוות המכירות 👋" : "שלום 👋";
}
