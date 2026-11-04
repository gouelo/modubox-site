import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { Empty, ils, NoDatabase, PageTitle } from "@/components/admin/ui";
import { listCustomers } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/session";
import { formatDateTime } from "@/lib/admin/time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "לקוחות" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("customers");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 80);
  const list = await listCustomers(db, q);
  return (
    <>
      <PageTitle title="לקוחות" sub="כל מי שהזמין, לפי מספר טלפון" />
      <form method="get" className="mb-4 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          חיפוש לקוח
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="שם, טלפון, מייל או עיר" className="field min-h-12 flex-1" />
        <button type="submit" className="btn-primary min-h-12 px-5">
          חיפוש
        </button>
      </form>
      {list.length ? (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.key}>
              <Link href={`/admin/customers/${c.key}/`} className="card flex items-center gap-3 p-4 transition hover:border-brand/40 hover:shadow-lift">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-tint text-lg font-extrabold text-brand-dark" aria-hidden>
                  {c.name.trim().charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{c.name}</span>
                  <span className="block truncate text-sm text-ink-soft">
                    <span dir="ltr">{c.phone}</span>
                    {c.city ? ` · ${c.city}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-end">
                  <span className="block font-extrabold">{ils(c.spent)}</span>
                  <span className="block text-xs text-ink-soft">
                    {c.orders === 1 ? "הזמנה אחת" : `${c.orders} הזמנות`} · <bdi>{formatDateTime(c.lastOrderAt).split(",")[0]}</bdi>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{q ? "לא נמצאו לקוחות." : "עוד אין לקוחות."}</Empty>
      )}
    </>
  );
}
