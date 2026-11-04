import type { OrderSource, OrderStatus } from "@/db/schema";

/**
 * An order's statuses and the moves between them.
 *
 *   pending_payment → (paid, by Z-Credit's verified callback) → new
 *   new → confirmed → in_production → scheduled → completed
 *   any → cancelled; a paid order → refunded (final)
 *
 * Along the main line any move is allowed, forwards or back (a mistake is
 * corrected by moving back), and every move is kept in the order's history.
 * Only a payment moves an order out of "waiting for payment".
 */
export const FLOW: OrderStatus[] = ["new", "confirmed", "in_production", "scheduled", "completed"];
export const OPEN: OrderStatus[] = ["new", "confirmed", "in_production", "scheduled"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "ממתינה לתשלום",
  new: "חדשה",
  confirmed: "אושרה",
  in_production: "בייצור",
  scheduled: "מתוזמנת לאספקה",
  completed: "הותקנה / הושלמה",
  cancelled: "בוטלה",
  refunded: "זוכתה",
};

/** Tailwind classes of a status badge */
export const STATUS_TONE: Record<OrderStatus, string> = {
  pending_payment: "bg-slate-100 text-slate-600 ring-slate-200",
  new: "bg-copper-tint text-copper-deep ring-copper/30",
  confirmed: "bg-sky-50 text-sky-800 ring-sky-200",
  in_production: "bg-violet-50 text-violet-800 ring-violet-200",
  scheduled: "bg-brand-tint text-brand-dark ring-brand/30",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  refunded: "bg-rose-50 text-rose-700 ring-rose-200",
};

/** The one next step of an order, as the big button on its page. */
export const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: "confirmed", label: "אישור ההזמנה" },
  confirmed: { to: "in_production", label: "העברה לייצור" },
  in_production: { to: "scheduled", label: "קביעת מועד אספקה" },
  scheduled: { to: "completed", label: "סימון: הותקנה" },
};

export function isStatus(x: unknown): x is OrderStatus {
  return typeof x === "string" && x in STATUS_LABEL;
}

export function canTransition(from: OrderStatus, to: OrderStatus, paid: boolean): boolean {
  if (from === to || to === "pending_payment" || from === "refunded") return false;
  if (to === "refunded") return paid;
  if (to === "cancelled") return true;
  if (FLOW.includes(to)) return paid && (FLOW.includes(from) || from === "cancelled");
  return false;
}

/** The statuses an order may move to from where it is. */
export function allowedMoves(from: OrderStatus, paid: boolean): OrderStatus[] {
  // forwards first, then back along the line, then cancelled and refunded
  const at = FLOW.indexOf(from);
  const order: OrderStatus[] = [...FLOW.slice(at + 1), ...FLOW.slice(0, Math.max(at, 0)).reverse(), "cancelled", "refunded"];
  return order.filter((to) => canTransition(from, to, paid));
}

/** Orders that count as sales: paid, and not cancelled or refunded. */
export const SALE_STATUSES: OrderStatus[] = FLOW;

/** Where an order came from: the site's checkout (null), or entered in the admin. */
export const SOURCE_LABEL: Record<OrderSource, string> = { phone: "טלפון", whatsapp: "וואטסאפ", other: "אחר" };
export const sourceLabel = (s: OrderSource | null | undefined) => (s ? SOURCE_LABEL[s] ?? s : "אתר");

/** The marketing checkbox: yes, no, or not asked (orders from before it existed, manual orders). */
export const consentLabel = (c: boolean | null | undefined) => (c === true ? "כן" : c === false ? "לא" : "");

/** How a manual order (one entered in the admin) is paid. */
export const MANUAL_PAYMENTS = ["transfer", "cash", "check", "zcredit_link", "other"] as const;
export type ManualPayment = (typeof MANUAL_PAYMENTS)[number];
export const PAYMENT_LABEL: Record<ManualPayment, string> = { transfer: "העברה בנקאית", cash: "מזומן", check: "צ׳ק", zcredit_link: "קישור תשלום Z-Credit", other: "אחר" };
export const paymentLabel = (p: string | null | undefined) => (p ? (PAYMENT_LABEL[p as ManualPayment] ?? p) : "");
