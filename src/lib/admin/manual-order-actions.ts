"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { orderEvents, orders, type OrderSource } from "@/db/schema";
import { activeCoupons } from "../coupon-store";
import { buildCreateSession, createSession, zcreditConfig } from "../zcredit";
import type { ActionState } from "./actions";
import { markManualPaid, MANUAL_PAYMENTS, priceManualOrder, saveManualOrder, type ManualOrderInput, type ManualPayment } from "./manual-order";
import { requestOrigin } from "./origin";
import { requireAdmin } from "./session";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** A phone or WhatsApp order, from /admin/orders/new/. On success: to the new order's page. */
export async function createManualOrderAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin("orders");
  const db = getDb();
  if (!db) return { error: "מסד הנתונים לא מחובר, אז אי אפשר לשמור." };
  let items: unknown;
  try {
    items = JSON.parse(str(form, "items"));
  } catch {
    return { error: "פרטי המוצרים לא נקראו. רעננו את הדף ונסו שוב." };
  }
  const payment = str(form, "payment") as ManualPayment;
  const input: ManualOrderInput = {
    items,
    coupon: str(form, "coupon"),
    discount: str(form, "discount") ? Number(str(form, "discount").replace(/[,\s₪]/g, "")) : 0,
    customer: { name: str(form, "name"), phone: str(form, "phone"), email: str(form, "email"), city: str(form, "city"), address: str(form, "address"), notes: str(form, "notes") },
    source: str(form, "source") as OrderSource,
    payment,
    paid: payment !== "zcredit_link" && form.get("paid") === "on",
    installments: Number(str(form, "installments")) || 1,
  };
  const priced = priceManualOrder(input, await activeCoupons(db));
  if (!priced.ok) return { error: priced.error };
  const config = payment === "zcredit_link" ? zcreditConfig() : null;
  if (payment === "zcredit_link" && !config) return { error: "התשלום באתר (Z-Credit) לא מוגדר, אז אי אפשר ליצור קישור תשלום." };

  let id: string;
  try {
    id = await saveManualOrder(db, input, priced);
  } catch (e) {
    console.error("[orders] manual order failed:", e);
    return { error: "השמירה נכשלה. נסו שוב בעוד רגע." };
  }
  if (config) {
    // the payment page for the customer: the callback marks the order paid, as at checkout
    const session = await createSession(buildCreateSession(config, priced.order, id, await requestOrigin()));
    if (session.ok) {
      await db.update(orders).set({ paymentLink: session.url, zcreditSessionId: session.sessionId }).where(eq(orders.id, id));
      await db.insert(orderEvents).values({ orderId: id, kind: "note", text: "נוצר קישור תשלום Z-Credit ללקוח", actor: "admin" });
    } else {
      console.error("[orders] manual order payment link failed", JSON.stringify({ id, status: session.status, code: session.code, message: session.message }));
      await db.insert(orderEvents).values({ orderId: id, kind: "note", text: `יצירת קישור התשלום נכשלה (Z-Credit: ${session.message.slice(0, 200)})`, actor: "admin" });
    }
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/orders/${id}/?created=1`);
}

export async function markPaidAction(form: FormData): Promise<void> {
  await requireAdmin("orders");
  const db = getDb();
  const id = str(form, "id");
  const payment = str(form, "payment") as ManualPayment;
  if (db && MANUAL_PAYMENTS.includes(payment)) await markManualPaid(db, id, payment);
  revalidatePath(`/admin/orders/${id}/`);
}
