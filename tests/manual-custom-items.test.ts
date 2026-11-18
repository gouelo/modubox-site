import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db";
import type { AdminSession } from "../src/lib/admin/auth";
import { CUSTOM_SLUG, paymentItems } from "../src/lib/checkout";
import { parseCoupons } from "../src/lib/coupons";
import { getOrder } from "../src/lib/orders";
import { customerOrderEmail, orderEmail } from "../src/lib/notify";
import { ordersCsv } from "../src/lib/admin/csv";
import { priceManualOrder, readCustomLines, saveManualOrder, type ManualOrderInput } from "../src/lib/admin/manual-order";
import type { CreateSessionRequest } from "../src/lib/zcredit";
import { testDb } from "./db";

// Lines typed in by hand on a manual order (something the site doesn't sell, at its own price).
// Z-Credit is always mocked here: never the live terminal.
let db: Db;
vi.mock("@/db", () => ({ getDb: () => db }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("@/lib/admin/session", () => ({ requireAdmin: async () => ({ user: "admin", role: "owner" }) as AdminSession }));
vi.mock("../src/lib/admin/origin", () => ({ requestOrigin: async () => "https://modubox.com" }));
const { createManualOrderAction, paymentLinkAgainAction } = await import("../src/lib/admin/manual-order-actions");

const items = [{ slug: "modubox-2x2", qty: 1, selections: { "sliding-window": 2, "profile-color": "white" }, fulfillment: "deliveryAndInstallation" }];
const shelf = { name: "מדף עבודה מעץ", price: 850, qty: 2 };
const input = (x: Partial<ManualOrderInput> = {}): ManualOrderInput => ({ items, custom: [shelf], customer: { name: "דנה כהן", phone: "+972 52-123-4567" }, source: "phone", payment: "zcredit_link", paid: false, ...x });
const none = new Map();

describe("readCustomLines", () => {
  it("reads name, price and quantity, and drops rows left empty", () => {
    expect(readCustomLines([{ name: "  מדף   עבודה ", price: "1,200 ₪", qty: "2" }, { name: "", price: "" }])).toEqual({ ok: true, lines: [{ name: "מדף עבודה", price: 1200, qty: 2 }] });
    expect(readCustomLines(undefined)).toEqual({ ok: true, lines: [] });
    expect(readCustomLines([{ name: "מדף", price: 100 }])).toEqual({ ok: true, lines: [{ name: "מדף", price: 100, qty: 1 }] });
  });

  it.each([
    [[{ name: "", price: 100 }], "שם"],
    [[{ name: "מדף", price: 0 }], "מחיר"],
    [[{ name: "מדף", price: -50 }], "מחיר"],
    [[{ name: "מדף", price: 99.5 }], "מחיר"],
    [[{ name: "מדף", price: "abc" }], "מחיר"],
    [[{ name: "מדף", price: 1_000_001 }], "מחיר"],
    [[{ name: "מדף", price: 100, qty: 0 }], "כמות"],
    [[{ name: "מדף", price: 100, qty: 1.5 }], "כמות"],
    [[{ name: "x".repeat(101), price: 100 }], "ארוך"],
    [Array.from({ length: 21 }, () => ({ name: "מדף", price: 100 })), "עד 20"],
    ["not a list", "לא נקראו"],
  ])("refuses %j", (x, err) => {
    const r = readCustomLines(x);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(err);
  });
});

describe("a manual order with custom lines", () => {
  it("adds them to the total and to Z-Credit's lines, which still add up", () => {
    const plain = priceManualOrder(input({ custom: [] }), none);
    const r = priceManualOrder(input(), none);
    if (!plain.ok || !r.ok) throw new Error("not priced");
    expect(r.order.total).toBe(plain.order.total + 1700);
    const pay = paymentItems(r.order);
    expect(pay.at(-1)).toMatchObject({ Name: "מדף עבודה מעץ", Amount: 850, Quantity: 2 });
    expect(pay.reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(r.order.total);
  });

  it("with a coupon and a phone deal, Z-Credit's lines add up to the discounted total, none negative", () => {
    const r = priceManualOrder(input({ coupon: "SALE10", discount: 300 }), parseCoupons("SALE10=10%"));
    if (!r.ok) throw new Error(r.error);
    const pay = paymentItems(r.order);
    expect(pay.reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(r.order.total);
    expect(pay.every((x) => x.Amount > 0)).toBe(true);
  });

  it("refuses a bad custom line with its own message", () => {
    expect(priceManualOrder(input({ custom: [{ name: "מדף", price: 0 }] }), none)).toMatchObject({ ok: false, error: expect.stringContaining("מחיר פריט ידני") });
  });

  describe("saved", () => {
    beforeEach(async () => {
      db = await testDb();
    });

    it("keeps each as an order line (no delivery of its own), in the items total and the history", async () => {
      const r = priceManualOrder(input(), none);
      if (!r.ok) throw new Error(r.error);
      const id = await saveManualOrder(db, input(), r);
      const full = (await getOrder(db, id))!;
      const line = full.items.find((i) => i.productSlug === CUSTOM_SLUG)!;
      expect(line).toMatchObject({ productName: "מדף עבודה מעץ", qty: 2, basePrice: 850, unitTotal: 850, itemsTotal: 1700, fulfillment: "none", fulfillmentTotal: 0, addons: [] });
      expect(full.order.total).toBe(r.order.total);
      expect(full.order.itemsTotal).toBe(r.order.cart.itemsTotal + 1700);
      expect(full.events.find((e) => e.kind === "created")!.text).toContain("פריטים ידניים: מדף עבודה מעץ ×2 (1700 ₪)");

      const mail = orderEmail(full, "https://modubox.com/admin");
      expect(mail.text).toContain("מדף עבודה מעץ ×2");
      expect(mail.text).not.toMatch(/•\s*$/m);
      const customer = customerOrderEmail(full, "https://modubox.com");
      expect(customer.text).toContain("מדף עבודה מעץ ×2");
      expect(customer.text).not.toMatch(/•\s*:?\s*$/m);
      expect(ordersCsv([{ order: full.order, items: full.items }])).toContain("מדף עבודה מעץ ×2");
    });
  });
});

describe("its Z-Credit payment link (mocked)", () => {
  const sent: CreateSessionRequest[] = [];
  beforeEach(async () => {
    db = await testDb();
    sent.length = 0;
    vi.stubEnv("ZCREDIT_WEBCHECKOUT_KEY", "test-key");
    vi.stubEnv("ZCREDIT_TERMINAL_NUMBER", "2071556014");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        sent.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ HasError: false, Data: { HasError: false, SessionId: "s1", SessionUrl: "https://pci.zcredit.co.il/webcheckout/s1" } }), { status: 200 });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("from the new-order form: the custom line is in the cart, the amount is the order's, the phone digits only", async () => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ items: JSON.stringify(items), custom: JSON.stringify([{ name: "מדף עבודה מעץ", price: "850", qty: 2 }]), name: "דנה כהן", phone: "+972 52-123-4567", source: "phone", payment: "zcredit_link", maxInstallments: "12" })) f.set(k, v);
    await createManualOrderAction({}, f);
    expect(sent).toHaveLength(1);
    const req = sent[0];
    expect(req.Customer.PhoneNumber).toBe("0521234567");
    expect(req.CartItems.some((x) => x.Name === "מדף עבודה מעץ" && x.Amount === 850 && x.Quantity === 2)).toBe(true);
    const full = (await getOrder(db, req.UniqueId))!;
    expect(req.CartItems.reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(full.order.total);
    expect(full.order.paymentLink).toBe("https://pci.zcredit.co.il/webcheckout/s1");
  });

  it("again from the saved order: the same lines and amount", async () => {
    const r = priceManualOrder(input(), none);
    if (!r.ok) throw new Error(r.error);
    const id = await saveManualOrder(db, input(), r);
    const f = new FormData();
    f.set("id", id);
    f.set("maxInstallments", "12");
    await paymentLinkAgainAction(f);
    expect(sent[0].CartItems.some((x) => x.Name === "מדף עבודה מעץ" && x.Amount === 850 && x.Quantity === 2)).toBe(true);
    expect(sent[0].CartItems.reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(r.order.total);
  });
});
