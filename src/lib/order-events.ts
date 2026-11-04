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
      const id = await sendEmail(email, { ...msg, replyTo: full.order.customerEmail ?? undefined });
      console.info("[orders] business email sent", { orderId: p.orderId, to: email.to, from: email.from, resendId: id });
      sent.push(`נשלח מייל לעסק על ההזמנה (אל ${email.to.join(", ")})`);
    } else {
      // never silent: the order's history and the logs say why the business wasn't emailed
      console.warn("[orders] business email skipped: ORDER_EMAIL_TO is missing or invalid", { orderId: p.orderId });
      sent.push("לא נשלח מייל לעסק: ORDER_EMAIL_TO לא מוגדר ב־Vercel");
    }
    const customer = await sendCustomerEmail(full, origin);
    if (customer) sent.push(`נשלח מייל אישור הזמנה ללקוח (אל ${customer})`);
    return sent;
  });
}

/** The customer's confirmation, answering the address it went to: never throws, so it never holds up the callback or resends the business email. */
async function sendCustomerEmail(full: FullOrder, origin: string): Promise<string | null> {
  const c = customerEmailConfig(full);
  if (!c.ok) {
    console.info("[orders] customer email skipped", { orderId: full.order.id, reason: c.reason });
    return null;
  }
  try {
    const id = await sendEmail(c.config, { ...customerOrderEmail(full, origin), replyTo: c.replyTo });
    console.info("[orders] customer email sent", { orderId: full.order.id, resendId: id });
    return c.config.to[0];
  } catch (e) {
    console.error("[orders] customer email failed", { orderId: full.order.id, error: String(e) });
    return null;
  }
}
