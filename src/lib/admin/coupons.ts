import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { coupons, type CouponRow } from "@/db/schema";
import { couponFromRow, couponUsage } from "../coupon-store";
import { normalizeCode, parseCoupons, type Coupon } from "../coupons";

/** The coupons screen's data: the admin's coupons, the env var's, and what each one sold. */

export interface CouponInput {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  minTotal: number | null;
  until: string | null;
  delivery: boolean;
  maxUses: number | null;
  enabled: boolean;
  note: string | null;
}

export interface CouponListItem {
  code: string;
  coupon: Coupon;
  /** null: only in MODUBOX_COUPONS */
  row: CouponRow | null;
  /** the env var has this code too (a row replaces it) */
  inEnv: boolean;
  uses: number;
  discount: number;
  total: number;
}

export async function listCoupons(db: Db, env = process.env.MODUBOX_COUPONS): Promise<CouponListItem[]> {
  const envCoupons = parseCoupons(env);
  const [rows, usage] = await Promise.all([db.select().from(coupons).orderBy(asc(coupons.code)), couponUsage(db)]);
  const usageOf = (code: string) => usage.get(code) ?? { uses: 0, discount: 0, total: 0 };
  const out: CouponListItem[] = rows.map((row) => ({ code: row.code, coupon: couponFromRow(row), row, inEnv: envCoupons.has(row.code), ...usageOf(row.code) }));
  for (const [code, coupon] of envCoupons) if (!rows.some((r) => r.code === code)) out.push({ code, coupon, row: null, inEnv: true, ...usageOf(code) });
  return out;
}

export async function getCoupon(db: Db, code: string): Promise<CouponRow | null> {
  const [row] = await db.select().from(coupons).where(eq(coupons.code, normalizeCode(code)));
  return row ?? null;
}

/** An error in Hebrew, or null when the coupon can be saved. */
export function couponError(c: CouponInput): string | null {
  if (!/^[A-Z0-9_-]{2,30}$/.test(c.code)) return "קוד: 2–30 תווים, אותיות באנגלית, ספרות, מקף או קו תחתון.";
  if (!Number.isInteger(c.value) || c.value < 1) return "גובה ההנחה: מספר שלם מ־1 ומעלה.";
  if (c.kind === "percent" && c.value > 100) return "הנחה באחוזים: עד 100.";
  if (c.minTotal !== null && !(Number.isInteger(c.minTotal) && c.minTotal >= 0)) return "סכום מינימום לא תקין.";
  if (c.maxUses !== null && !(Number.isInteger(c.maxUses) && c.maxUses >= 1)) return "מספר שימושים: מספר שלם מ־1 ומעלה, או ריק בלי הגבלה.";
  if (c.until !== null && !/^\d{4}-\d{2}-\d{2}$/.test(c.until)) return "תאריך תפוגה לא תקין.";
  return null;
}

/** Saves a coupon; with `previous` (a code renamed) the old row goes. */
export async function saveCoupon(db: Db, c: CouponInput, previous?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const input = { ...c, code: normalizeCode(c.code) };
  const error = couponError(input);
  if (error) return { ok: false, error };
  const prev = previous ? normalizeCode(previous) : "";
  if (prev !== input.code && (await getCoupon(db, input.code))) return { ok: false, error: `כבר יש קופון בשם ${input.code}.` };
  const now = new Date();
  await db.transaction(async (tx) => {
    if (prev && prev !== input.code) await tx.delete(coupons).where(eq(coupons.code, prev));
    await tx
      .insert(coupons)
      .values({ ...input, updatedAt: now })
      .onConflictDoUpdate({ target: coupons.code, set: { ...input, updatedAt: now } });
  });
  return { ok: true };
}

export async function deleteCoupon(db: Db, code: string): Promise<void> {
  await db.delete(coupons).where(eq(coupons.code, normalizeCode(code)));
}

/** Copies the env var's coupons into the admin (codes already there are left alone). Answers how many were added. */
export async function importEnvCoupons(db: Db, env = process.env.MODUBOX_COUPONS): Promise<number> {
  const list = [...parseCoupons(env).values()];
  if (!list.length) return 0;
  const added = await db
    .insert(coupons)
    .values(list.map((c) => ({ code: c.code, kind: c.kind, value: Math.round(c.value), minTotal: c.min ?? null, until: c.until ?? null, delivery: c.delivery, enabled: true, note: "יובא מ־MODUBOX_COUPONS" })))
    .onConflictDoNothing()
    .returning({ code: coupons.code });
  return added.length;
}
