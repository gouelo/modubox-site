import type { OrderSource, OrderStatus } from "@/db/schema";

/**
 * An order's statuses and the moves between them. The business uses only two:
 *
 *   pending_payment → (paid, by Z-Credit's verified callback) → new
 *   new ⇄ cancelled
 *
 * Orders from before (confirmed, in production, scheduled, completed) show and
 * count as "new"; a refunded one shows as "cancelled" and stays final. Every
 * move is kept in the order's history. Only a payment moves an order out of
 * "waiting for payment".
 */
export const LEGACY_OPEN: OrderStatus[] = ["confirmed", "in_production", "scheduled", "completed"];
/** Everything that reads as "new": open orders, and the ones that count as sales once paid. */
export const OPEN: OrderStatus[] = ["new", ...LEGACY_OPEN];
export const CANCELLED: OrderStatus[] = ["cancelled", "refunded"];

/** The status as the admin shows it: one of pending_payment, new, cancelled. */
export function shownStatus(s: OrderStatus): OrderStatus {
  return OPEN.includes(s) ? "new" : CANCELLED.includes(s) ? "cancelled" : s;
}

/** The statuses' own names, for the history of older orders. */
export const STATUS_NAME: Record<OrderStatus, string> = {
  pending_payment: "ממתינה לתשלום",
  new: "חדשה",
  confirmed: "אושרה",
  in_production: "בייצור",
  scheduled: "מתוזמנת לאספקה",
  completed: "הותקנה / הושלמה",
  cancelled: "בוטלה",
  refunded: "זוכתה",
};

const SHOWN_LABEL: Partial<Record<OrderStatus, string>> = { pending_payment: "ממתינה לתשלום", new: "חדשה", cancelled: "בוטלה" };
export const STATUS_LABEL = Object.fromEntries(Object.keys(STATUS_NAME).map((s) => [s, SHOWN_LABEL[shownStatus(s as OrderStatus)]])) as Record<OrderStatus, string>;

const SHOWN_TONE: Partial<Record<OrderStatus, string>> = {
  pending_payment: "bg-slate-100 text-slate-600 ring-slate-200",
  new: "bg-copper-tint text-copper-deep ring-copper/30",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};
/** Tailwind classes of a status badge */
export const STATUS_TONE = Object.fromEntries(Object.keys(STATUS_NAME).map((s) => [s, SHOWN_TONE[shownStatus(s as OrderStatus)]])) as Record<OrderStatus, string>;

export function isStatus(x: unknown): x is OrderStatus {
  return typeof x === "string" && x in STATUS_NAME;
}

export function canTransition(from: OrderStatus, to: OrderStatus, paid: boolean): boolean {
  if (from === to || from === "refunded") return false;
  if (to === "cancelled") return true;
  if (to === "new") return paid && from === "cancelled";
  return false;
}

/** The statuses an order may move to from where it is. */
export function allowedMoves(from: OrderStatus, paid: boolean): OrderStatus[] {
  return (["new", "cancelled"] as OrderStatus[]).filter((to) => canTransition(from, to, paid));
}

/** Orders that count as sales: paid, and not cancelled or refunded. */
export const SALE_STATUSES: OrderStatus[] = OPEN;

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
