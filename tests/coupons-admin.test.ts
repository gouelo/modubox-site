import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "../src/db";
import { coupons, orders } from "../src/db/schema";
import { priceCheckout, type PricedOrder } from "../src/lib/checkout";
import { activeCoupons, mergeCoupons } from "../src/lib/coupon-store";
import { applyCoupon, parseCoupons } from "../src/lib/coupons";
import { recordPayment, saveNewOrder } from "../src/lib/orders";
import { couponError, importEnvCoupons, listCoupons, saveCoupon, type CouponInput } from "../src/lib/admin/coupons";
import { dashboard } from "../src/lib/admin/queries";
import { ordersCsv } from "../src/lib/admin/csv";
import { followUpLink, followUpText } from "../src/lib/admin/follow-up";
import { TEST_SLUG } from "../src/lib/catalog";
import { testDb } from "./db";

const customer = { name: "ישראל ישראלי", phone: "052-1234567", email: "a@b.co", city: "חיפה", address: "הרצל 1" };
const cart = { itemsTotal: 10_000, total: 11_000 } as never;
const input = (c: Partial<CouponInput> = {}): CouponInput => ({ code: "VIP", kind: "percent", value: 10, minTotal: null, until: null, delivery: false, maxUses: null, enabled: true, note: null, ...c });

function priced(code?: string, map = new Map(), extra: Record<string, unknown> = {}, slug = "modubox-2x2"): PricedOrder {
  const r = priceCheckout({ locale: "he", items: [{ slug, qty: 1, selections: {}, fulfillment: "pickup" }], customer, installments: 1, ...(code ? { coupon: code } : {}), ...extra }, { coupons: map });
  if (!r.ok) throw new Error(r.error);
  return r.order;
}

async function paidOrder(db: Db, id: string, o: PricedOrder) {
  await saveNewOrder(db, id, `s-${id}`, o);
  await recordPayment(db, { orderId: id, total: o.total, sessionId: `s-${id}`, data: {} as never });
}

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

describe("the admin's coupons over MODUBOX_COUPONS", () => {
  it("keeps the env var's codes, lets a row replace or turn one off, and adds new ones", () => {
    const env = parseCoupons("OLD=5%;GONE=100;SAME=10%");
    const row = (code: string, extra = {}) => ({ code, kind: "fixed" as const, value: 300, minTotal: null, until: null, delivery: false, maxUses: null, enabled: true, note: null, createdAt: new Date(), updatedAt: new Date(), ...extra });
    const m = mergeCoupons(env, [row("SAME"), row("GONE", { enabled: false }), row("NEW", { minTotal: 5000 })]);
    expect([...m.keys()].sort()).toEqual(["NEW", "OLD", "SAME"]);
    expect(m.get("SAME")).toMatchObject({ kind: "fixed", value: 300 });
    expect(m.get("NEW")).toMatchObject({ min: 5000 });
  });

  it("a coupon at its number of uses reads as expired", () => {
    const r = { code: "ONCE", kind: "percent" as const, value: 10, minTotal: null, until: null, delivery: false, maxUses: 1, enabled: true, note: null, createdAt: new Date(), updatedAt: new Date() };
    expect(applyCoupon("once", mergeCoupons(new Map(), [r], new Map([["ONCE", 0]])), cart)).toMatchObject({ ok: true });
    expect(applyCoupon("once", mergeCoupons(new Map(), [r], new Map([["ONCE", 1]])), cart)).toEqual({ ok: false, error: "expired" });
  });

  it("reads the database, counts paid uses, and falls back to the env var if the database fails", async () => {
    await saveCoupon(db, input({ code: "once", maxUses: 1 }));
    expect([...(await activeCoupons(db, "ENV=5%")).keys()].sort()).toEqual(["ENV", "ONCE"]);
    const map = await activeCoupons(db, "");
    await paidOrder(db, "261104000001", priced("ONCE", map));
    expect((await activeCoupons(db, "")).get("ONCE")?.usedUp).toBe(true);

    const broken = { select: () => { throw new Error("down"); } } as unknown as Db;
    expect([...(await activeCoupons(broken, "ENV=5%")).keys()]).toEqual(["ENV"]);
    expect([...(await activeCoupons(null, "ENV=5%")).keys()]).toEqual(["ENV"]);
  });

  it("checks, renames and imports coupons", async () => {
    expect(couponError(input({ code: "A B" }))).toBeTruthy();
    expect(couponError(input({ value: 150 }))).toBeTruthy();
    expect(couponError(input({ kind: "fixed", value: 150 }))).toBeNull();
    expect(await saveCoupon(db, input({ code: "first" }))).toEqual({ ok: true });
    expect(await saveCoupon(db, input({ code: "SECOND" }))).toEqual({ ok: true });
    expect(await saveCoupon(db, input({ code: "second" }), "FIRST")).toMatchObject({ ok: false });
    expect(await saveCoupon(db, input({ code: "third", value: 20 }), "FIRST")).toEqual({ ok: true });
    expect((await db.select().from(coupons)).map((r) => r.code).sort()).toEqual(["SECOND", "THIRD"]);

    expect(await importEnvCoupons(db, "THIRD=50%;HOVALA=900,delivery,until=2026-12-31")).toBe(1);
    const [h] = await db.select().from(coupons).where(eq(coupons.code, "HOVALA"));
    expect(h).toMatchObject({ kind: "fixed", value: 900, delivery: true, until: "2026-12-31" });
    expect((await db.select().from(coupons).where(eq(coupons.code, "THIRD")))[0].value).toBe(20);
  });

  it("lists each coupon's paid uses, discount and sales, without test or cancelled orders", async () => {
    await saveCoupon(db, input({ code: "VIP" }));
    const map = await activeCoupons(db, "ENVONLY=100");
    const a = priced("VIP", map);
    await paidOrder(db, "261104000001", a);
    await paidOrder(db, "261104000002", priced("VIP", map));
    await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, "261104000002"));
    await saveNewOrder(db, "261104000003", "s3", priced("VIP", map)); // never paid
    const list = await listCoupons(db, "ENVONLY=100");
    expect(list.find((i) => i.code === "VIP")).toMatchObject({ uses: 1, discount: a.coupon!.amount, total: a.total, inEnv: false });
    expect(list.find((i) => i.code === "ENVONLY")).toMatchObject({ row: null, inEnv: true, uses: 0 });
  });
});

describe("orders: marketing consent and test orders", () => {
  it("keeps the checkbox (unchecked unless sent as true)", async () => {
    await saveNewOrder(db, "261104000001", "s1", priced(undefined, new Map(), { customer: { ...customer, marketing: true } }));
    await saveNewOrder(db, "261104000002", "s2", priced(undefined, new Map(), { customer: { ...customer, marketing: "yes" } }));
    await saveNewOrder(db, "261104000003", "s3", priced());
    const rows = await db.select().from(orders).orderBy(orders.id);
    expect(rows.map((r) => r.marketingConsent)).toEqual([true, false, false]);
    expect(rows.every((r) => r.source === null && !r.isTest)).toBe(true);
  });

  it("marks the 1 ₪ product's orders as tests and leaves them out of sales", async () => {
    expect(TEST_SLUG).toBeTruthy();
    await paidOrder(db, "261104000001", priced(undefined, new Map(), {}, TEST_SLUG));
    await paidOrder(db, "261104000002", priced());
    const rows = await db.select().from(orders).orderBy(orders.id);
    expect(rows.map((r) => r.isTest)).toEqual([true, false]);
    const d = await dashboard(db);
    expect(d.today.orders).toBe(1);
    expect(d.today.amount).toBe(rows[1].total);
    const csv = ordersCsv(rows.map((order) => ({ order, items: [] })));
    expect(csv.split("\r\n")[0]).toMatch(/מקור,מסכים\/ה לדיוור,הזמנת בדיקה$/);
    expect(csv.split("\r\n")[1]).toMatch(/,אתר,לא,כן$/);
  });
});

describe("the abandoned-checkout WhatsApp follow-up", () => {
  it("names the product and links back to it, in the customer's language", () => {
    const o = { customerName: "דנה כהן", customerPhone: "052-123 4567", locale: "he" };
    const t = followUpText(o, { slug: "modubox-2x2", name: "מודובוקס 2×2", more: 0 }, "https://modubox-site.vercel.app");
    expect(t).toContain("שלום דנה");
    expect(t).toContain("מודובוקס 2×2");
    expect(t).toContain("https://modubox-site.vercel.app/product/modubox-2x2/");
    expect(followUpLink(o, undefined, "https://x.co")).toMatch(/^https:\/\/wa\.me\/972521234567\?text=/);
    expect(decodeURIComponent(followUpLink(o, undefined, "https://x.co").split("text=")[1])).toContain("https://x.co/cart/");
    const en = followUpText({ ...o, locale: "en" }, { slug: "modubox-2x2", name: "Modubox 2×2", more: 1 }, "https://x.co");
    expect(en).toContain("Modubox 2×2 and more");
    expect(en).toContain("https://x.co/en/product/modubox-2x2/");
  });
});
