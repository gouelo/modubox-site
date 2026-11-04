import { getDb } from "@/db";
import type { PricedOrder } from "./checkout";
import { emailConfig, orderEmail, sendEmail } from "./notify";
import { notifyPaidOrder, recordPayment, saveNewOrder, type Payment } from "./orders";

/**
 * What the checkout routes do with orders, in one place: save the new order,
 * and on a verified payment mark it paid and email the business. Without a
 * database (DATABASE_URL) they do nothing, and orders stay only in the logs.
 */

/** POST /api/checkout: never stops the customer from paying, even if the database fails. */
export async function persistNewOrder(orderId: string, sessionId: string, order: PricedOrder): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await saveNewOrder(db, orderId, sessionId, order);
  } catch (e) {
    // the callback makes the order from the payment if this one is missing
    console.error("[orders] saving the new order failed", { orderId, error: String(e) });
  }
}

/**
 * A verified payment (the callback, or the success page's check). Throws when
 * the database fails, so the callback answers an error and Z-Credit posts it again.
 */
export async function orderPaid(p: Payment, origin: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const { newlyPaid } = await recordPayment(db, p);
  if (newlyPaid) console.info("[orders] order marked paid", { orderId: p.orderId });
  const email = emailConfig();
  if (!email) return;
  await notifyPaidOrder(db, p.orderId, async (full) => {
    const msg = orderEmail(full, `${origin}/admin/orders/${encodeURIComponent(p.orderId)}/`);
    await sendEmail(email, { ...msg, replyTo: full.order.customerEmail ?? undefined });
  });
}
