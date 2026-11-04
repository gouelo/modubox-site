import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { ContactButtons, ils, NoDatabase, OrderCard, Row, Section } from "@/components/admin/ui";
import { getCustomer } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "לקוח" };

export default async function CustomerPage({ params }: { params: Promise<{ key: string }> }) {
  await requireAdmin("customers");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const { key } = await params;
  const { customer: c, orders } = await getCustomer(db, key.replace(/\D/g, ""));
  if (!c) notFound();
  return (
    <div className="space-y-4">
      <Link href="/admin/customers/" className="inline-block text-sm font-semibold text-brand-dark">
        → כל הלקוחות
      </Link>
      <Section>
        <h1 className="text-2xl font-extrabold">{c.name}</h1>
        <dl className="mt-2">
          <Row label="טלפון">
            <span dir="ltr">{c.phone}</span>
          </Row>
          <Row label="מייל">{c.email}</Row>
          <Row label="עיר">{c.city}</Row>
          <Row label="הזמנות ששולמו">{String(c.orders)}</Row>
          <Row label="סך הכל">{ils(c.spent)}</Row>
        </dl>
        <div className="mt-3">
          <ContactButtons phone={c.phone} email={c.email} name={c.name} />
        </div>
      </Section>
      <h2 className="text-base font-extrabold tracking-normal">ההזמנות של {c.name.split(" ")[0]}</h2>
      <ul className="space-y-2">
        {orders.map((o) => (
          <OrderCard key={o.id} o={o} />
        ))}
      </ul>
    </div>
  );
}
