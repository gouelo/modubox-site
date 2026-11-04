import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "../src/db";
import { orders } from "../src/db/schema";
import { priceCheckout, type PricedOrder } from "../src/lib/checkout";
import { addNote, changeStatus, customerKey, deleteOrders, getOrder, notifyPaidOrder, recordPayment, saveNewOrder } from "../src/lib/orders";
import { couponUsage } from "../src/lib/coupon-store";
import { deletedOrders, orderEvents, orderItems } from "../src/db/schema";
import { dashboard, exportOrders, getCustomer, listCustomers, listOrders, readFilters } from "../src/lib/admin/queries";
import { ordersCsv } from "../src/lib/admin/csv";
import { orderEmail } from "../src/lib/notify";
import { testDb } from "./db";

const customer = { name: "ישראל ישראלי", phone: "052-1234567", email: "a@b.co", city: "חיפה", address: "הרצל 1", notes: "לתאם מראש" };

function priced(extra: Record<string, unknown> = {}, items?: unknown[]): PricedOrder {
  const r = priceCheckout(
    {
      locale: "he",
      items: items ?? [{ slug: "modubox-2x2", qty: 1, selections: { "sliding-window": 2 }, fulfillment: "deliveryAndInstallation" }],
      customer,
      installments: 3,
      ...extra,
    },
    { coupons: new Map([["SALE10", { code: "SALE10", kind: "percent", value: 10 }]]) as never },
  );
  if (!r.ok) throw new Error(r.error);
  return r.order;
}

const paidData = { ReferenceNumber: "REF-77", ApprovalNumber: "0123456", PaymentMethod: 4, CardName: "Visa", CardNum: "1234", Installments: 3 };

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

describe("saving an order at checkout", () => {
  it("keeps the customer, items, add-ons, delivery and totals, waiting for payment", async () => {
    const o = priced();
    await saveNewOrder(db, "261104000001", "sess-1", o);
    const full = (await getOrder(db, "261104000001"))!;
    expect(full.order).toMatchObject({
      status: "pending_payment",
      customerName: "ישראל ישראלי",
      customerKey: "0521234567",
      city: "חיפה",
      customerNotes: "לתאם מראש",
      total: o.total,
      itemsTotal: 5990 + 2 * 1190,
      fulfillmentTotal: 900,
      installments: 3,
      zcreditSessionId: "sess-1",
      paidAt: null,
    });
    expect(full.items).toHaveLength(1);
    expect(full.items[0]).toMatchObject({ productSlug: "modubox-2x2", qty: 1, basePrice: 5990, itemsTotal: 5990 + 2380, fulfillment: "deliveryAndInstallation", fulfillmentTotal: 900 });
    expect(full.items[0].addons).toEqual([expect.objectContaining({ qty: 2, unitPrice: 1190, total: 2380 })]);
    expect(full.events.map((e) => e.kind)).toEqual(["created"]);
  });

  it("keeps the coupon and its discount", async () => {
    const o = priced({ coupon: "sale10" });
    await saveNewOrder(db, "261104000002", "s", o);
    const { order } = (await getOrder(db, "261104000002"))!;
    expect(order.couponCode).toBe("SALE10");
    expect(order.discount).toBe(o.coupon!.amount);
    expect(order.total).toBe(order.itemsTotal + order.fulfillmentTotal - order.discount);
  });

  it("phone numbers become one customer key", () => {
    expect(customerKey("052-123 4567")).toBe("0521234567");
    expect(customerKey("+972 52 1234567")).toBe("0521234567");
  });
});

describe("the verified payment", () => {
  it("marks the order paid once, with Z-Credit's details, and it becomes new", async () => {
    await saveNewOrder(db, "261104000003", "sess", priced());
    const total = priced().total;
    const at = new Date(Date.now() + 1000);
    expect(await recordPayment(db, { orderId: "261104000003", total, sessionId: "sess", data: paidData }, at)).toEqual({ newlyPaid: true });
    // Z-Credit retries, the success page asks too: nothing changes
    expect(await recordPayment(db, { orderId: "261104000003", total, sessionId: "sess", data: paidData }, new Date())).toEqual({ newlyPaid: false });
    const full = (await getOrder(db, "261104000003"))!;
    expect(full.order).toMatchObject({ status: "new", zcreditReference: "REF-77", approvalNumber: "0123456", paymentMethod: 4, card: "Visa 1234", paidInstallments: 3, paidAt: at });
    expect(full.events.map((e) => e.kind)).toEqual(["created", "paid"]);
    expect(full.events[1]).toMatchObject({ fromStatus: "pending_payment", toStatus: "new" });
  });

  it("makes the order from the payment when it wasn't saved at checkout", async () => {
    await recordPayment(db, { orderId: "261104000004", total: 1, sessionId: "s", data: { ...paidData, CustomerName: "דנה", CustomerPhone: "0501112222" } });
    const { order, items } = (await getOrder(db, "261104000004"))!;
    expect(order).toMatchObject({ status: "new", partial: true, customerName: "דנה", customerKey: "0501112222", total: 1 });
    expect(items).toEqual([]);
  });

  it("emails the business once, and tries again after a failed send", async () => {
    await saveNewOrder(db, "261104000005", "s", priced());
    await recordPayment(db, { orderId: "261104000005", total: priced().total, sessionId: "s", data: paidData });
    const fail = vi.fn().mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await notifyPaidOrder(db, "261104000005", fail)).toBe("failed");
    const send = vi.fn().mockResolvedValue(undefined);
    expect(await notifyPaidOrder(db, "261104000005", send)).toBe("sent");
    expect(await notifyPaidOrder(db, "261104000005", send)).toBe("already");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].order.id).toBe("261104000005");
  });

  it("the email says what was bought and links to the order", async () => {
    await saveNewOrder(db, "261104000006", "s", priced());
    await recordPayment(db, { orderId: "261104000006", total: priced().total, sessionId: "s", data: paidData });
    const m = orderEmail((await getOrder(db, "261104000006"))!, "https://x.test/admin/orders/261104000006/");
    expect(m.subject).toContain("ישראל ישראלי");
    expect(m.html).toContain('dir="rtl"');
    expect(m.html).toContain("https://x.test/admin/orders/261104000006/");
    expect(m.text).toContain("Apple Pay");
    expect(m.text).toContain("3 תשלומים");
  });
});

async function paidOrder(id: string, at = new Date()) {
  await saveNewOrder(db, id, "s", priced());
  await recordPayment(db, { orderId: id, total: priced().total, sessionId: "s", data: paidData }, at);
}

describe("statuses", () => {
  it("only new and cancelled, back and forth, each move in the history", async () => {
    await paidOrder("1");
    for (const to of ["confirmed", "in_production", "scheduled", "completed", "refunded"] as const) expect(await changeStatus(db, "1", to)).toEqual({ ok: false, error: "not_allowed" });
    expect(await changeStatus(db, "1", "cancelled")).toEqual({ ok: true });
    expect(await changeStatus(db, "1", "new")).toEqual({ ok: true });
    const { order, events } = (await getOrder(db, "1"))!;
    expect(order.status).toBe("new");
    expect(events.filter((e) => e.kind === "status").map((e) => `${e.fromStatus}>${e.toStatus}`)).toEqual(["new>cancelled", "cancelled>new"]);
  });

  it("an unpaid order can only be cancelled, and stays cancelled", async () => {
    await saveNewOrder(db, "2", "s", priced());
    expect(await changeStatus(db, "2", "new")).toEqual({ ok: false, error: "not_allowed" });
    expect(await changeStatus(db, "2", "cancelled")).toEqual({ ok: true });
    expect(await changeStatus(db, "2", "new")).toEqual({ ok: false, error: "not_allowed" });
  });

  it("an order left in an old status reads as new and can be cancelled; a refunded one stays final", async () => {
    await paidOrder("3");
    await paidOrder("4");
    await db.update(orders).set({ status: "scheduled" }).where(eq(orders.id, "3"));
    await db.update(orders).set({ status: "refunded" }).where(eq(orders.id, "4"));
    expect((await listOrders(db, readFilters({ view: "new" }))).rows.map((r) => r.id)).toEqual(["3"]);
    expect((await listOrders(db, readFilters({ view: "scheduled" }))).rows.map((r) => r.id)).toEqual(["3"]);
    expect((await listOrders(db, readFilters({ view: "cancelled" }))).rows.map((r) => r.id)).toEqual(["4"]);
    expect((await dashboard(db)).today.orders).toBe(1);
    expect(await changeStatus(db, "3", "cancelled")).toEqual({ ok: true });
    expect(await changeStatus(db, "4", "new")).toEqual({ ok: false, error: "not_allowed" });
  });

  it("internal notes go into the history", async () => {
    await paidOrder("5");
    expect(await addNote(db, "5", "  ביקש צבע שחור  ")).toEqual({ ok: true });
    expect(await addNote(db, "5", "   ")).toEqual({ ok: false, error: "invalid" });
    expect(await addNote(db, "nope", "x")).toEqual({ ok: false, error: "not_found" });
    expect((await getOrder(db, "5"))!.events.at(-1)).toMatchObject({ kind: "note", text: "ביקש צבע שחור" });
  });
});

describe("the admin's lists", () => {
  it("dashboard: today's and this month's sales in Israel, new this week and abandoned", async () => {
    const now = new Date("2026-11-04T10:00:00Z");
    await paidOrder("a", new Date("2026-11-04T08:00:00Z"));
    // 23:30 on the 3rd in Israel: this month, not today
    await paidOrder("b", new Date("2026-11-03T21:30:00Z"));
    await paidOrder("c", new Date("2026-10-30T10:00:00Z"));
    await paidOrder("d", new Date("2026-11-04T09:00:00Z"));
    await changeStatus(db, "d", "cancelled");
    await saveNewOrder(db, "e", "s", priced());
    const t = priced().total;
    const d = await dashboard(db, now);
    expect(d.today).toEqual({ amount: t, orders: 1 });
    expect(d.month).toEqual({ amount: 2 * t, orders: 2 });
    // a, b, c (paid 5 days ago); d was cancelled, e isn't paid
    expect(d.newOrders).toBe(3);
    expect((await dashboard(db, new Date("2026-11-08T10:00:00Z"))).newOrders).toBe(2);
    expect(d.abandoned).toBe(1);
    expect(d.recent.map((o) => o.id)).not.toContain("e");
  });

  it("list: paid by default, by status, and search by name, phone or order number", async () => {
    await paidOrder("261104000010");
    await saveNewOrder(db, "261104000011", "s", priced());
    expect((await listOrders(db, readFilters({}))).rows.map((r) => r.id)).toEqual(["261104000010"]);
    expect((await listOrders(db, readFilters({ view: "pending_payment" }))).rows.map((r) => r.id)).toEqual(["261104000011"]);
    expect((await listOrders(db, readFilters({ view: "all", q: "ישראלי" }))).total).toBe(2);
    expect((await listOrders(db, readFilters({ q: "052 1234" }))).total).toBe(1);
    expect((await listOrders(db, readFilters({ view: "all", q: "000011" }))).rows[0].id).toBe("261104000011");
    expect((await listOrders(db, readFilters({ q: "nobody" }))).total).toBe(0);
    expect(readFilters({ view: "bogus", page: "-3", from: "x" })).toEqual({ view: "paid", q: "", page: 1, from: undefined, to: undefined });
  });

  it("customers: orders grouped by phone", async () => {
    await paidOrder("x1");
    await paidOrder("x2");
    await db.update(orders).set({ customerPhone: "+972-52-1234567" }).where(eq(orders.id, "x2"));
    const list = await listCustomers(db);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ key: "0521234567", orders: 2, spent: 2 * priced().total, name: "ישראל ישראלי" });
    const one = await getCustomer(db, "0521234567");
    expect(one.orders).toHaveLength(2);
  });

  it("CSV: Hebrew for Excel, quoted cells, no formulas", async () => {
    await paidOrder("c1");
    await db.update(orders).set({ customerNotes: '=HYPERLINK("x"), "שחור"' }).where(eq(orders.id, "c1"));
    const csv = ordersCsv(await exportOrders(db, readFilters({})));
    expect(csv.startsWith("\uFEFFמספר הזמנה,")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x""), ""שחור"""`);
    expect(csv.split("\r\n")[1]).toMatch(/^c1,/);
  });
});

describe("deleting orders", () => {
  it("removes the order with its items and history, keeps a record, and coupon uses follow", async () => {
    await saveNewOrder(db, "d1", "s", priced({ coupon: "SALE10" }));
    await recordPayment(db, { orderId: "d1", total: priced({ coupon: "SALE10" }).total, sessionId: "s", data: paidData });
    await addNote(db, "d1", "בדיקה");
    await paidOrder("d2");
    expect((await couponUsage(db)).get("SALE10")?.uses).toBe(1);

    expect(await deleteOrders(db, ["d1", "d1", " ", "nope"], "admin")).toBe(1);
    expect(await getOrder(db, "d1")).toBeNull();
    expect(await db.select().from(orderItems).where(eq(orderItems.orderId, "d1"))).toEqual([]);
    expect(await db.select().from(orderEvents).where(eq(orderEvents.orderId, "d1"))).toEqual([]);
    expect(await db.select().from(deletedOrders)).toMatchObject([{ id: "d1", paid: true, customerName: customer.name }]);
    expect((await couponUsage(db)).get("SALE10")).toBeUndefined();
    expect(await getOrder(db, "d2")).not.toBeNull();
    expect(await deleteOrders(db, [])).toBe(0);
  });

  it("a late payment for a deleted order is acknowledged and never makes it again", async () => {
    await saveNewOrder(db, "d3", "s", priced());
    expect(await deleteOrders(db, ["d3"])).toBe(1);
    expect(await recordPayment(db, { orderId: "d3", total: 100, sessionId: "s", data: paidData })).toEqual({ newlyPaid: false, deleted: true });
    expect(await getOrder(db, "d3")).toBeNull();
    // one never saved at all is still made from the payment
    expect(await recordPayment(db, { orderId: "d4", total: 100, sessionId: "s", data: paidData })).toEqual({ newlyPaid: true });
  });
});
