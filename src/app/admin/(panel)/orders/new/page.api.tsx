import Link from "next/link";
import { getDb } from "@/db";
import { ManualOrderForm } from "@/components/admin/ManualOrderForm";
import { NoDatabase, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";
import { zcreditConfig } from "@/lib/zcredit";

export const dynamic = "force-dynamic";
export const metadata = { title: "הזמנה חדשה" };

/** A sale closed on the phone or on WhatsApp, so every order is in one place. */
export default async function NewOrderPage() {
  await requireAdmin("orders");
  if (!getDb()) return <NoDatabase />;
  return (
    <>
      <PageTitle title="הזמנה חדשה" sub={<>מכירה בטלפון או בוואטסאפ. המחירים כמו באתר. <Link href="/admin/orders/" className="underline">חזרה להזמנות</Link></>} />
      <ManualOrderForm payLink={!!zcreditConfig()} />
    </>
  );
}
