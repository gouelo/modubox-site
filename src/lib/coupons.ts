import type { CartSummary } from "./pricing";

/**
 * Coupon codes. The repository is public, so the codes are not in it: they
 * come from the MODUBOX_COUPONS environment variable (Vercel → Settings →
 * Environment Variables), read on the server only. One coupon per entry,
 * separated by ";" (or new lines):
 *
 *   PINUK10=10%;SALE500=500
 *   VIP15=15%,min=10000,until=2026-12-31;HOVALA=900,delivery
 *
 *   CODE=10%          10 percent off
 *   CODE=500          500 ₪ off ("500₪" works too)
 *   min=10000         only on orders of at least 10,000 ₪
 *   until=2026-12-31  valid through that day (Israel time)
 *   delivery          the discount also covers delivery and installation
 *                     (without it: the products only)
 *
 * Codes are not case sensitive. An entry that can't be read is skipped.
 */

export interface Coupon {
  code: string;
  kind: "percent" | "fixed";
  /** percent (1–100) or shekels */
  value: number;
  /** order total (before the discount) it needs, in shekels */
  min?: number;
  /** last valid day, YYYY-MM-DD, Israel time */
  until?: string;
  /** also discounts delivery and installation */
  delivery: boolean;
}

export type CouponMap = Map<string, Coupon>;

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

export function parseCoupons(raw: string | undefined): CouponMap {
  const out: CouponMap = new Map();
  for (const entry of (raw ?? "").split(/[;\n]/)) {
    const [head, ...opts] = entry.split(",").map((x) => x.trim());
    const m = head?.match(/^([A-Za-z0-9_-]+)\s*=\s*(\d+(?:\.\d+)?)\s*(%|₪|ש"ח|nis)?$/i);
    if (!m) continue;
    const value = Number(m[2]);
    const kind = m[3] === "%" ? "percent" : "fixed";
    if (!(value > 0) || (kind === "percent" && value > 100)) continue;
    const c: Coupon = { code: normalizeCode(m[1]), kind, value, delivery: false };
    let ok = true;
    for (const o of opts) {
      const [k, v = ""] = o.split("=").map((x) => x.trim());
      const key = k.toLowerCase();
      if (key === "delivery") c.delivery = true;
      else if (key === "min" && /^\d+$/.test(v)) c.min = Number(v);
      else if (key === "until" && /^\d{4}-\d{2}-\d{2}$/.test(v)) c.until = v;
      else if (key) ok = false;
    }
    if (ok) out.set(c.code, c);
  }
  return out;
}

/** Today in Israel, YYYY-MM-DD. */
export function israelToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type CouponError = "unknown" | "expired" | "min_order";

export interface AppliedCoupon {
  code: string;
  /** whole shekels off */
  amount: number;
  /** the discount covers delivery and installation too */
  delivery: boolean;
}

export type CouponResult = { ok: true; coupon: AppliedCoupon } | { ok: false; error: CouponError; min?: number };

/**
 * A code checked against the cart: it exists, it is still valid, the order is
 * big enough. The discount is whole shekels, on the products (or on
 * everything with `delivery`), and never brings the total below 1 ₪.
 */
export function applyCoupon(code: string, coupons: CouponMap, cart: CartSummary, today = israelToday()): CouponResult {
  const c = coupons.get(normalizeCode(code));
  if (!c) return { ok: false, error: "unknown" };
  if (c.until && today > c.until) return { ok: false, error: "expired" };
  if (c.min && cart.total < c.min) return { ok: false, error: "min_order", min: c.min };
  const base = c.delivery ? cart.total : cart.itemsTotal;
  const raw = c.kind === "percent" ? Math.round((base * c.value) / 100) : Math.round(c.value);
  const amount = Math.max(0, Math.min(raw, base, cart.total - 1));
  return { ok: true, coupon: { code: c.code, amount, delivery: c.delivery } };
}
