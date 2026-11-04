import { and, count, eq, inArray, isNotNull, notInArray, sum } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { coupons, orders, type CouponRow } from "@/db/schema";
import { normalizeCode, parseCoupons, type Coupon, type CouponMap } from "./coupons";

/**
 * The coupons the checkout honors: the MODUBOX_COUPONS env var, with the
 * admin's coupons (table coupons) on top. A row with an env code replaces it,
 * and a disabled row turns it off. If the database can't be read, the env
 * var's coupons alone still work. Server code only.
 */

/** Paid, real (not test), not cancelled or refunded: an order a coupon was used on. */
export const usedOn = () => and(isNotNull(orders.paidAt), eq(orders.isTest, false), notInArray(orders.status, ["cancelled", "refunded"]));

export function couponFromRow(r: CouponRow): Coupon {
  return { code: r.code, kind: r.kind, value: r.value, delivery: r.delivery, ...(r.minTotal ? { min: r.minTotal } : {}), ...(r.until ? { until: r.until } : {}) };
}

/** The env var's coupons with the rows on top; `uses` marks the coupons that reached their limit. */
export function mergeCoupons(env: CouponMap, rows: CouponRow[], uses: Map<string, number> = new Map()): CouponMap {
  const out: CouponMap = new Map(env);
  for (const r of rows) {
    const code = normalizeCode(r.code);
    if (!r.enabled) {
      out.delete(code);
      continue;
    }
    const c = couponFromRow({ ...r, code });
    if (r.maxUses !== null && (uses.get(code) ?? 0) >= r.maxUses) c.usedUp = true;
    out.set(code, c);
  }
  return out;
}

/** Times each code was used, and the discount and sales it brought (paid real orders). */
export async function couponUsage(db: Db, codes?: string[]): Promise<Map<string, { uses: number; discount: number; total: number }>> {
  if (codes && codes.length === 0) return new Map();
  const rows = await db
    .select({ code: orders.couponCode, uses: count(), discount: sum(orders.discount), total: sum(orders.total) })
    .from(orders)
    .where(and(usedOn(), isNotNull(orders.couponCode), codes ? inArray(orders.couponCode, codes) : undefined))
    .groupBy(orders.couponCode);
  return new Map(rows.map((r) => [r.code!, { uses: Number(r.uses), discount: Number(r.discount ?? 0), total: Number(r.total ?? 0) }]));
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([p, new Promise<never>((_, no) => (timer = setTimeout(() => no(new Error(`timed out after ${ms} ms`)), ms)))]);
  } finally {
    clearTimeout(timer);
  }
}

/** The coupons for /api/coupon and /api/checkout. */
export async function activeCoupons(db: Db | null = getDb(), env = process.env.MODUBOX_COUPONS): Promise<CouponMap> {
  const base = parseCoupons(env);
  if (!db) return base;
  try {
    return await withTimeout(
      (async () => {
        const rows = await db.select().from(coupons);
        const limited = rows.filter((r) => r.enabled && r.maxUses !== null).map((r) => r.code);
        const usage = await couponUsage(db, limited);
        return mergeCoupons(base, rows, new Map([...usage].map(([k, v]) => [k, v.uses])));
      })(),
      4000,
    );
  } catch (e) {
    console.error("[coupons] reading the admin's coupons failed; MODUBOX_COUPONS only", String(e));
    return base;
  }
}
