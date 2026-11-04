import { getDb } from "@/db";
import type { PricedOrder } from "./checkout";
import { customerEmailConfig, customerOrderEmail, emailConfig, orderEmail, sendEmail } from "./notify";
import { notifyPaidOrder, recordPayment, saveNewOrder, type FullOrder, type Payment } from "./orders";

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
  if (!email && !process.env.RESEND_API_KEY?.trim()) return;
  await notifyPaidOrder(db, p.orderId, async (full) => {
    const sent: string[] = [];
    // the business first: if it fails, the claim is released and both go on the next try
    if (email) {
      const msg = orderEmail(full, `${origin}/admin/orders/${encodeURIComponent(p.orderId)}/`);
      await sendEmail(email, { ...msg, replyTo: full.order.customerEmail ?? undefined });
      sent.push("נשלח מייל לעסק על ההזמנה");
    }
    if (await sendCustomerEmail(full, origin)) sent.push("נשלח מייל אישור הזמנה ללקוח");
    return sent;
  });
}

/** The customer's confirmation: never throws, so it never holds up the callback or resends the business email. */
async function sendCustomerEmail(full: FullOrder, origin: string): Promise<boolean> {
  const c = customerEmailConfig(full);
  if (!c.ok) {
    console.info("[orders] customer email skipped", { orderId: full.order.id, reason: c.reason });
    return false;
  }
  try {
    await sendEmail(c.config, { ...customerOrderEmail(full, origin), replyTo: c.replyTo });
    return true;
  } catch (e) {
    console.error("[orders] customer email failed", { orderId: full.order.id, error: String(e) });
    return false;
  }
}
