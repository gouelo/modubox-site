import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { deletedOrders, orderEvents, orderItems, orders, type NewOrder, type Order, type OrderEvent, type OrderItem, type OrderStatus } from "@/db/schema";
import { canTransition } from "./admin/status";
import { plain, TEST_SLUG } from "./catalog";
import type { PricedOrder } from "./checkout";
import type { CallbackData } from "./zcredit";

/**
 * Orders in the database: saved when the checkout creates a Z-Credit payment
 * page, marked paid by the verified callback, then run from the admin panel.
 * Server code only.
 */

/** A phone number as the customer's key: digits only, +972 as 0 (052-123 4567 → 0521234567). */
export function customerKey(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("972") ? `0${d.slice(3)}` : d;
}

type NewItem = typeof orderItems.$inferInsert;

/** The rows of a priced order (src/lib/checkout.ts), as the database keeps them. */
export function orderRows(orderId: string, sessionId: string, order: PricedOrder): { order: NewOrder; items: NewItem[] } {
  const c = order.customer;
  return {
    order: {
      id: orderId,
      status: "pending_payment",
      locale: order.locale,
      customerName: c.name,
      customerPhone: c.phone,
      customerKey: customerKey(c.phone),
      customerEmail: c.email || null,
      city: c.city || null,
      address: c.address || null,
      customerNotes: c.notes || null,
      itemsTotal: order.cart.itemsTotal,
      fulfillmentTotal: order.cart.fulfillmentTotal,
      payLater: order.cart.payLater,
      couponCode: order.coupon?.code ?? null,
      discount: order.coupon?.amount ?? 0,
      total: order.total,
      installments: order.installments,
      zcreditSessionId: sessionId || null,
      marketingConsent: c.marketing === true,
      isTest: !!TEST_SLUG && order.cart.lines.some((l) => l.product.slug === TEST_SLUG),
    },
    items: order.cart.lines.map((l, i) => ({
      orderId,
      position: i,
      productSlug: l.product.slug,
      productName: plain(l.product.name),
      qty: l.item.qty,
      basePrice: l.product.price,
      unitTotal: l.quote.total,
      itemsTotal: l.itemsTotal,
      addons: l.quote.lines.slice(1).map((x) => ({ label: plain(x.label), qty: x.qty, unitPrice: x.unitPrice, total: x.total })),
      fulfillment: l.fulfillment.id,
      fulfillmentLabel: plain(l.fulfillment.label),
      fulfillmentPrice: l.fulfillment.price,
      fulfillmentTotal: l.fulfillmentTotal + l.payLater,
      payToInstaller: !!l.fulfillment.payToInstaller,
      designLink: l.item.design?.link ?? null,
    })),
  };
}

/** Saves a new order, waiting for payment (POST /api/checkout, once Z-Credit gave it a payment page). */
export async function saveNewOrder(db: Db, orderId: string, sessionId: string, order: PricedOrder): Promise<void> {
  const rows = orderRows(orderId, sessionId, order);
  await db.transaction(async (tx) => {
    await tx.insert(orders).values(rows.order);
    if (rows.items.length) await tx.insert(orderItems).values(rows.items);
    await tx.insert(orderEvents).values({ orderId, kind: "created", toStatus: "pending_payment", text: "הלקוח עבר לדף התשלום" });
  });
}

export interface Payment {
  orderId: string;
  /** the amount the callback's signature vouches for */
  total: number;
  sessionId: string;
  /** Z-Credit's transaction (GetSessionStatus → CallBackJSON), already verified */
  data: CallbackData;
}

const PAYMENT_METHOD: Record<number, string> = { 0: "כרטיס אשראי", 1: "כרטיס אשראי (3DS)", 4: "Apple Pay", 6: "Google Pay" };
export const paymentMethodLabel = (m: number | null | undefined) => (m === null || m === undefined ? "" : PAYMENT_METHOD[m] ?? `אמצעי ${m}`);

/**
 * Marks an order paid, from a verified payment. Idempotent: Z-Credit retries
 * its callback and the success page asks too, but an order is paid once.
 * An order that wasn't saved at checkout (no database then, or it failed) is
 * made from the payment alone. Answers whether this call marked it paid.
 */
export async function recordPayment(db: Db, p: Payment, now = new Date()): Promise<{ newlyPaid: boolean; deleted?: true }> {
  const d = p.data;
  return db.transaction(async (tx) => {
    let [row] = await tx.select().from(orders).where(eq(orders.id, p.orderId)).for("update");
    // deleted in the admin: acknowledged, never made again
    if (!row && (await tx.select({ id: deletedOrders.id }).from(deletedOrders).where(eq(deletedOrders.id, p.orderId))).length) return { newlyPaid: false, deleted: true as const };
    if (!row) {
      const phone = String(d.CustomerPhone ?? "");
      [row] = await tx
        .insert(orders)
        .values({
          id: p.orderId,
          status: "pending_payment",
          customerName: String(d.CustomerName ?? "") || "לקוח (ללא פרטים)",
          customerPhone: phone,
          customerKey: customerKey(phone),
          customerEmail: d.CustomerEmail ? String(d.CustomerEmail) : null,
          total: p.total,
          installments: Number(d.Installments) || 1,
          zcreditSessionId: p.sessionId,
          partial: true,
          createdAt: now,
        })
        .returning();
      await tx.insert(orderEvents).values({ orderId: p.orderId, kind: "created", toStatus: "pending_payment", text: "ההזמנה לא נשמרה בקופה: נוצרה מפרטי התשלום בלבד", at: now });
    }
    if (row.paidAt) return { newlyPaid: false };
    const to: OrderStatus = row.status === "pending_payment" ? "new" : row.status;
    await tx
      .update(orders)
      .set({
        paidAt: now,
        updatedAt: now,
        status: to,
        zcreditSessionId: p.sessionId || row.zcreditSessionId,
        zcreditReference: d.ReferenceNumber ? String(d.ReferenceNumber) : null,
        approvalNumber: d.ApprovalNumber ? String(d.ApprovalNumber) : null,
        paymentMethod: d.PaymentMethod === undefined || d.PaymentMethod === null ? null : Number(d.PaymentMethod),
        card: [d.CardName, d.CardNum].filter(Boolean).join(" ") || null,
        paidInstallments: d.Installments ? Number(d.Installments) : null,
      })
      .where(eq(orders.id, p.orderId));
    await tx.insert(orderEvents).values({ orderId: p.orderId, kind: "paid", fromStatus: row.status, toStatus: to, text: `שולם ${p.total} ₪ ב־Z-Credit`, at: now });
    return { newlyPaid: true };
  });
}

export interface FullOrder {
  order: Order;
  items: OrderItem[];
  events: OrderEvent[];
}

export async function getOrder(db: Db, id: string): Promise<FullOrder | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return null;
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.position)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(asc(orderEvents.at), asc(orderEvents.id)),
  ]);
  return { order, items, events };
}

/**
 * Sends the emails about a paid order, once. The order is claimed first
 * (notified_at), so a callback and the success page at the same moment send
 * one; when `send` throws, the claim is released for the next try. `send`
 * answers what to write in the order's history (default: the business email).
 */
export async function notifyPaidOrder(db: Db, id: string, send: (o: FullOrder) => Promise<string[] | void>, now = new Date()): Promise<"sent" | "already" | "failed"> {
  const [claimed] = await db
    .update(orders)
    .set({ notifiedAt: now })
    .where(and(eq(orders.id, id), isNull(orders.notifiedAt)))
    .returning({ id: orders.id });
  if (!claimed) return "already";
  try {
    const full = await getOrder(db, id);
    if (!full) throw new Error("order not found");
    const sent = (await send(full)) ?? ["נשלח מייל לעסק על ההזמנה"];
    if (sent.length) await db.insert(orderEvents).values(sent.map((text) => ({ orderId: id, kind: "email" as const, text, at: now })));
    return "sent";
  } catch (e) {
    console.error("[orders] order email failed", { id, error: String(e) });
    await db.update(orders).set({ notifiedAt: null }).where(eq(orders.id, id));
    return "failed";
  }
}

/**
 * An order the business works on: paid online, or a sale entered in the
 * admin (phone, WhatsApp), which may be paid later, by transfer or cash.
 */
export const committed = (o: { paidAt: Date | null; source: string | null }) => !!o.paidAt || !!o.source;

export type ChangeResult = { ok: true } | { ok: false; error: "not_found" | "not_allowed" | "invalid" };

/** Moves an order to another status, if the rules allow it (src/lib/admin/status.ts), and keeps it in its history. */
export async function changeStatus(db: Db, id: string, to: OrderStatus, actor = "admin", now = new Date()): Promise<ChangeResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
    if (!row) return { ok: false, error: "not_found" } as const;
    if (!canTransition(row.status, to, committed(row))) return { ok: false, error: "not_allowed" } as const;
    await tx.update(orders).set({ status: to, updatedAt: now }).where(eq(orders.id, id));
    await tx.insert(orderEvents).values({ orderId: id, kind: "status", fromStatus: row.status, toStatus: to, actor, at: now });
    return { ok: true } as const;
  });
}

/**
 * Deletes orders for good, with their items and history (the foreign keys
 * cascade). Each id is kept in deleted_orders, so a late payment callback
 * doesn't make it again. Coupon uses are counted from the orders, so a deleted
 * order stops counting. Answers how many were deleted.
 */
export async function deleteOrders(db: Db, ids: string[], actor = "admin", now = new Date()): Promise<number> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 200);
  if (!unique.length) return 0;
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(orders).where(inArray(orders.id, unique)).for("update");
    if (!rows.length) return 0;
    await tx
      .insert(deletedOrders)
      .values(rows.map((o) => ({ id: o.id, deletedAt: now, actor, customerName: o.customerName, total: o.total, status: o.status, paid: !!o.paidAt })))
      .onConflictDoNothing();
    await tx.delete(orders).where(inArray(orders.id, rows.map((o) => o.id)));
    return rows.length;
  });
}

/** An internal note on an order (never shown to the customer). */
export async function addNote(db: Db, id: string, text: string, actor = "admin", now = new Date()): Promise<ChangeResult> {
  const note = text.trim().slice(0, 2000);
  if (!note) return { ok: false, error: "invalid" };
  const [row] = await db.update(orders).set({ updatedAt: now }).where(eq(orders.id, id)).returning({ id: orders.id });
  if (!row) return { ok: false, error: "not_found" };
  await db.insert(orderEvents).values({ orderId: id, kind: "note", text: note, actor, at: now });
  return { ok: true };
}

