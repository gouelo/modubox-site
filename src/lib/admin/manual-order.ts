import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { orderEvents, orderItems, orders, ORDER_SOURCES, type OrderSource } from "@/db/schema";
import { priceCart, validPhone, newOrderId, type PricedOrder } from "../checkout";
import type { CouponMap } from "../coupons";
import { orderRows } from "../orders";
import { MANUAL_PAYMENTS, PAYMENT_LABEL, type ManualPayment } from "./status";
import type { Customer } from "../whatsapp";

/**
 * An order taken on the phone or on WhatsApp, entered in the admin
 * (/admin/orders/new/): priced by the same code as the site's checkout, so a
 * phone sale costs what the site says. It starts as a new order; payment is a
 * bank transfer, cash, a check, or a Z-Credit payment link sent to the
 * customer (the callback marks it paid, like a checkout). Server code only.
 */

export { MANUAL_PAYMENTS, PAYMENT_LABEL, paymentLabel, type ManualPayment } from "./status";

export interface ManualOrderInput {
  /** the cart, as the site's checkout sends it: [{ slug, qty, selections, fulfillment }] */
  items: unknown;
  coupon?: string;
  /** shekels off on top of the price (a deal made on the phone) */
  discount?: number;
  customer: { name: string; phone: string; email?: string; city?: string; address?: string; notes?: string };
  source: OrderSource;
  payment: ManualPayment;
  /** already paid (a transfer that arrived, cash) */
  paid: boolean;
  installments?: number;
}

export type ManualPriced = { ok: true; order: PricedOrder; couponCode: string | null; manualDiscount: number } | { ok: false; error: string };

const ERRORS: Record<string, string> = {
  invalid_request: "פרטי המוצרים לא תקינים.",
  unknown_product: "אחד המוצרים לא נמצא בקטלוג.",
  empty_cart: "צריך לבחור לפחות מוצר אחד.",
  price_on_request: "יש בהזמנה משהו שמחירו בתיאום (בלי מחיר באתר). בחרו אפשרות עם מחיר, ואת ההפרש הוסיפו בהערות.",
};

/** The same pricing as the site's checkout, then the phone deal's discount. */
export function priceManualOrder(input: ManualOrderInput, coupons: CouponMap): ManualPriced {
  const c = input.customer;
  const customer: Customer = { name: c.name.trim().slice(0, 80), phone: c.phone.trim().slice(0, 20), email: c.email?.trim().slice(0, 120) ?? "", city: c.city?.trim().slice(0, 60) ?? "", address: c.address?.trim().slice(0, 120) ?? "", notes: c.notes?.trim().slice(0, 1000) ?? "" };
  if (customer.name.length < 2) return { ok: false, error: "שם הלקוח חסר." };
  if (!validPhone(customer.phone, "en")) return { ok: false, error: "מספר הטלפון לא תקין." };
  if (customer.email && !/^\S+@\S+\.\S+$/.test(customer.email)) return { ok: false, error: "המייל לא תקין." };
  if (!ORDER_SOURCES.includes(input.source)) return { ok: false, error: "מקור ההזמנה לא תקין." };
  if (!MANUAL_PAYMENTS.includes(input.payment)) return { ok: false, error: "אמצעי התשלום לא תקין." };
  const priced = priceCart({ locale: "he", items: input.items, ...(input.coupon?.trim() ? { coupon: input.coupon.trim() } : {}) }, { coupons });
  if (!priced.ok) {
    if (priced.error === "invalid_coupon") return { ok: false, error: priced.coupon?.error === "min_order" ? `הקופון תקף רק מעל ${priced.coupon.min} ₪.` : priced.coupon?.error === "expired" ? "הקופון פג תוקף או נוצל." : "קוד הקופון לא קיים." };
    return { ok: false, error: ERRORS[priced.error] ?? "לא הצלחנו לתמחר את ההזמנה." };
  }
  const discount = input.discount ?? 0;
  if (!(Number.isInteger(discount) && discount >= 0)) return { ok: false, error: "הנחה: מספר שלם בשקלים." };
  const couponAmount = priced.coupon?.amount ?? 0;
  if (couponAmount + discount > priced.cart.total - 1) return { ok: false, error: "ההנחה גדולה מהמחיר." };
  const n = input.installments ?? 1;
  const order: PricedOrder = {
    locale: "he",
    customer,
    installments: Number.isInteger(n) && n >= 1 && n <= 12 ? n : 1,
    cart: priced.cart,
    // one discount line for Z-Credit: the coupon and the phone deal together
    coupon: couponAmount + discount ? { code: priced.coupon?.code ?? "MANUAL", amount: couponAmount + discount, delivery: priced.coupon?.delivery ?? true } : null,
    total: priced.cart.total - couponAmount - discount,
  };
  return { ok: true, order, couponCode: priced.coupon?.code ?? null, manualDiscount: discount };
}

/** Saves a manual order. Answers its number. */
export async function saveManualOrder(db: Db, input: ManualOrderInput, priced: Extract<ManualPriced, { ok: true }>, actor = "admin", now = new Date(), id = newOrderId(now)): Promise<string> {
  const rows = orderRows(id, "", priced.order);
  const label = { phone: "בטלפון", whatsapp: "בוואטסאפ", other: "" }[input.source];
  await db.transaction(async (tx) => {
    await tx.insert(orders).values({
      ...rows.order,
      status: "new",
      couponCode: priced.couponCode,
      source: input.source,
      payment: input.payment,
      marketingConsent: null,
      isTest: false,
      createdAt: now,
      updatedAt: now,
      ...(input.paid ? { paidAt: now } : {}),
    });
    if (rows.items.length) await tx.insert(orderItems).values(rows.items);
    const parts = [`הזמנה ידנית${label ? ` ${label}` : ""}, ${PAYMENT_LABEL[input.payment]}`, priced.manualDiscount ? `הנחה ${priced.manualDiscount} ₪` : ""].filter(Boolean);
    await tx.insert(orderEvents).values({ orderId: id, kind: "created", toStatus: "new", text: parts.join(" · "), actor, at: now });
    if (input.paid) await tx.insert(orderEvents).values({ orderId: id, kind: "paid", text: `שולם ${priced.order.total} ₪ (${PAYMENT_LABEL[input.payment]})`, actor, at: now });
  });
  return id;
}

/** A manual order's payment arrived (a transfer, cash). */
export async function markManualPaid(db: Db, id: string, payment: ManualPayment, actor = "admin", now = new Date()): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
    if (!row || row.paidAt || !row.source || row.status === "cancelled" || row.status === "refunded") return false;
    await tx.update(orders).set({ paidAt: now, payment, updatedAt: now }).where(eq(orders.id, id));
    await tx.insert(orderEvents).values({ orderId: id, kind: "paid", text: `שולם ${row.total} ₪ (${PAYMENT_LABEL[payment]})`, actor, at: now });
    return true;
  });
}
