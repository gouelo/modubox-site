import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "../src/db";
import { orderEvents, orders } from "../src/db/schema";
import { priceCart, priceCheckout, paymentItems } from "../src/lib/checkout";
import { parseCoupons } from "../src/lib/coupons";
import { changeStatus, getOrder, recordPayment } from "../src/lib/orders";
import { markManualPaid, priceManualOrder, saveManualOrder, type ManualOrderInput } from "../src/lib/admin/manual-order";
import { dashboard } from "../src/lib/admin/queries";
import { ordersCsv } from "../src/lib/admin/csv";
import { testDb } from "./db";

const items = [{ slug: "modubox-2x2", qty: 1, selections: { "sliding-window": 2 }, fulfillment: "deliveryAndInstallation" }];
const input = (x: Partial<ManualOrderInput> = {}): ManualOrderInput => ({ items, customer: { name: "רונית לוי", phone: "054-7654321" }, source: "phone", payment: "transfer", paid: false, ...x });
const coupons = parseCoupons("SALE10=10%");

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

describe("a manual (phone) order", () => {
  it("is priced exactly like the site's checkout, coupon included", () => {
    const site = priceCheckout({ locale: "he", items, coupon: "SALE10", customer: { name: "רונית לוי", phone: "054-7654321", city: "חיפה", address: "הרצל 1" }, installments: 1 }, { coupons });
    const manual = priceManualOrder(input({ coupon: "sale10" }), coupons);
    expect(site.ok && manual.ok).toBe(true);
    if (!site.ok || !manual.ok) return;
    expect(manual.order.total).toBe(site.order.total);
    expect(manual.order.cart.total).toBe(priceCart({ items }).ok && (priceCart({ items }) as { cart: { total: number } }).cart.total);
    expect(manual.couponCode).toBe("SALE10");
  });

  it("takes a phone deal's discount, and Z-Credit's lines still add up", () => {
    const r = priceManualOrder(input({ coupon: "SALE10", discount: 250, payment: "zcredit_link" }), coupons);
    if (!r.ok) throw new Error(r.error);
    const plain = priceManualOrder(input(), coupons);
    if (!plain.ok) throw new Error(plain.error);
    const coupon = Math.round(plain.order.cart.itemsTotal * 0.1);
    expect(r.order.total).toBe(plain.order.total - coupon - 250);
    expect(r.order.coupon).toMatchObject({ code: "SALE10", amount: coupon + 250 });
    expect(paymentItems(r.order).reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(r.order.total);
  });

  it("refuses what it can't price or save", () => {
    expect(priceManualOrder(input({ customer: { name: "א", phone: "054-7654321" } }), coupons)).toMatchObject({ ok: false });
    expect(priceManualOrder(input({ customer: { name: "רונית", phone: "12" } }), coupons)).toMatchObject({ ok: false });
    expect(priceManualOrder(input({ items: [] }), coupons)).toMatchObject({ ok: false });
    expect(priceManualOrder(input({ coupon: "NOPE" }), coupons)).toEqual({ ok: false, error: "קוד הקופון לא קיים." });
    expect(priceManualOrder(input({ discount: 10_000_000 }), coupons)).toMatchObject({ ok: false });
    expect(priceManualOrder(input({ payment: "bitcoin" as never }), coupons)).toMatchObject({ ok: false });
  });

  it("is saved as a new order from the phone, worked on before it is paid, and counted in sales once paid", async () => {
    const r = priceManualOrder(input({ discount: 100 }), coupons);
    if (!r.ok) throw new Error(r.error);
    const id = await saveManualOrder(db, input({ discount: 100 }), r);
    const full = (await getOrder(db, id))!;
    expect(full.order).toMatchObject({ status: "new", source: "phone", payment: "transfer", paidAt: null, couponCode: null, discount: 100, total: r.order.total, marketingConsent: null, isTest: false, customerKey: "0547654321" });
    expect(full.items).toHaveLength(1);
    expect(full.events[0].text).toContain("הזמנה ידנית בטלפון");
    expect((await dashboard(db)).today.orders).toBe(0);

    // unpaid, but a committed sale: it can be cancelled and brought back
    expect(await changeStatus(db, id, "cancelled")).toEqual({ ok: true });
    expect(await changeStatus(db, id, "new")).toEqual({ ok: true });
    expect(await changeStatus(db, id, "refunded")).toMatchObject({ ok: false });

    expect(await markManualPaid(db, id, "cash")).toBe(true);
    expect(await markManualPaid(db, id, "cash")).toBe(false);
    const paid = (await getOrder(db, id))!;
    expect(paid.order.payment).toBe("cash");
    expect(paid.order.paidAt).toBeTruthy();
    expect(paid.events.at(-1)!.text).toContain("מזומן");
    expect((await dashboard(db)).today).toEqual({ amount: r.order.total, orders: 1 });
    expect(ordersCsv([{ order: paid.order, items: paid.items }]).split("\r\n")[1]).toContain("מזומן");
  });

  it("paid on creation, or paid through its Z-Credit link by the callback", async () => {
    const r = priceManualOrder(input({ paid: true, payment: "cash" }), coupons);
    if (!r.ok) throw new Error(r.error);
    const id = await saveManualOrder(db, input({ paid: true, payment: "cash" }), r);
    expect((await db.select().from(orderEvents).where(eq(orderEvents.orderId, id))).map((e) => e.kind)).toEqual(["created", "paid"]);

    const l = priceManualOrder(input({ payment: "zcredit_link" }), coupons);
    if (!l.ok) throw new Error(l.error);
    const lid = await saveManualOrder(db, input({ payment: "zcredit_link" }), l);
    expect(await recordPayment(db, { orderId: lid, total: l.order.total, sessionId: "s", data: { ReferenceNumber: "R1" } as never })).toEqual({ newlyPaid: true });
    const [row] = await db.select().from(orders).where(eq(orders.id, lid));
    expect(row).toMatchObject({ status: "new", zcreditReference: "R1", source: "phone" });
  });
});
