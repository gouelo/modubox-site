import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db";
import type { AdminSession } from "../src/lib/admin/auth";
import { priceCheckout } from "../src/lib/checkout";
import { parseCoupons, type CouponMap } from "../src/lib/coupons";
import { getOrder } from "../src/lib/orders";
import { zcreditPhone } from "../src/lib/phone";
import { priceManualOrder, saveManualOrder, type ManualOrderInput } from "../src/lib/admin/manual-order";
import { buildCreateSession, createSession, ZCREDIT_API, type CreateSessionRequest } from "../src/lib/zcredit";
import { testDb } from "./db";

// The phone Z-Credit's CreateSession gets (Customer.PhoneNumber): digits only, or the
// whole session fails ("Parameter 'Customer PhoneNumber' was send with an invalid value").
// Z-Credit is always mocked here: never the live terminal.
let db: Db;
vi.mock("@/db", () => ({ getDb: () => db }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("@/lib/admin/session", () => ({ requireAdmin: async () => ({ user: "admin", role: "owner" }) as AdminSession }));
vi.mock("../src/lib/admin/origin", () => ({ requestOrigin: async () => "https://modubox.com" }));
const { paymentLinkAgainAction } = await import("../src/lib/admin/manual-order-actions");
const { editCustomerAction } = await import("../src/lib/admin/actions");

const config = { key: "test-key", terminal: "2071556014" };
const items = [{ slug: "modubox-2x2", qty: 1, selections: { "sliding-window": 2, "profile-color": "white" }, fulfillment: "deliveryAndInstallation" }];
const typed = ["052-1234567", "0521234567", "052 123 4567", "+972 52-123-4567", "+972521234567", "972521234567", "00972521234567", "+972 (0)52-123-4567", "‏052-1234567"];

/** A mocked Z-Credit: answers a session, and keeps every body it was sent. */
function zcredit(answer: unknown = { HasError: false, Data: { HasError: false, ReturnCode: 0, SessionId: "s1", SessionUrl: "https://pci.zcredit.co.il/webcheckout/s1" } }) {
  const sent: CreateSessionRequest[] = [];
  const f = vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe(`${ZCREDIT_API}/CreateSession`);
    sent.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify(answer), { status: 200 });
  });
  return { f: f as unknown as typeof fetch, sent };
}

describe("zcreditPhone", () => {
  it.each(typed)("%s goes as 0521234567", (p) => expect(zcreditPhone(p)).toBe("0521234567"));
  it("sends a landline as digits, and leaves a number from abroad (or none) empty", () => {
    expect(zcreditPhone("+972 2-123-4567")).toBe("021234567");
    expect(zcreditPhone("+44 20 7946 0958")).toBe("");
    expect(zcreditPhone("")).toBe("");
  });
});

describe("the phone sent to CreateSession", () => {
  it.each(typed)("site checkout, typed %s: PhoneNumber 0521234567", async (phone) => {
    const r = priceCheckout({ locale: "he", items, customer: { name: "דנה כהן", phone, city: "חיפה", address: "הרצל 1" }, installments: 1 });
    if (!r.ok) throw new Error(r.error);
    const z = zcredit();
    expect((await createSession(buildCreateSession(config, r.order, "1", "https://modubox.com"), z.f)).ok).toBe(true);
    expect(z.sent[0].Customer.PhoneNumber).toBe("0521234567");
  });

  it.each(typed)("manual order, typed %s: PhoneNumber 0521234567", async (phone) => {
    const r = priceManualOrder({ items, customer: { name: "דנה כהן", phone }, source: "phone", payment: "zcredit_link", paid: false }, new Map());
    if (!r.ok) throw new Error(r.error);
    expect(r.order.customer.phone).toBe("052-1234567");
    const z = zcredit();
    await createSession(buildCreateSession(config, r.order, "1", "https://modubox.com"), z.f);
    expect(z.sent[0].Customer.PhoneNumber).toBe("0521234567");
  });

  it("an English order from abroad leaves PhoneNumber empty", async () => {
    const r = priceCheckout({ locale: "en", items, customer: { name: "Dana Cohen", phone: "+44 20 7946 0958", city: "Haifa", address: "Herzl 1" }, installments: 1 });
    if (!r.ok) throw new Error(r.error);
    expect(buildCreateSession(config, r.order, "1", "https://modubox.com").Customer.PhoneNumber).toBe("");
  });
});

describe("a new payment link for an unpaid manual order", () => {
  const input = (x: Partial<ManualOrderInput> = {}): ManualOrderInput => ({ items, customer: { name: "דנה כהן", phone: "052-1234567" }, source: "phone", payment: "zcredit_link", paid: false, ...x });
  async function saved(x: Partial<ManualOrderInput> = {}, coupons: CouponMap = new Map()) {
    const priced = priceManualOrder(input(x), coupons);
    if (!priced.ok) throw new Error(priced.error);
    return { id: await saveManualOrder(db, input(x), priced), priced };
  }
  const form = (id: string, maxInstallments = "6") => {
    const f = new FormData();
    f.set("id", id);
    f.set("maxInstallments", maxInstallments);
    return f;
  };

  beforeEach(async () => {
    db = await testDb();
    vi.stubEnv("ZCREDIT_WEBCHECKOUT_KEY", config.key);
    vi.stubEnv("ZCREDIT_TERMINAL_NUMBER", config.terminal);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("after the first link failed: fix the phone, then a new link goes with the corrected phone and the same amount", async () => {
    const { id, priced } = await saved();
    const edit = new FormData();
    for (const [k, v] of Object.entries({ id, name: "דנה כהן", phone: "+972 54-765-4321", email: "", city: "", address: "", notes: "" })) edit.set(k, v);
    expect((await editCustomerAction({}, edit)).ok).toBe(true);

    const z = zcredit();
    vi.stubGlobal("fetch", z.f);
    await paymentLinkAgainAction(form(id));
    expect(z.sent).toHaveLength(1);
    const req = z.sent[0];
    expect(req.Customer).toEqual({ Name: "דנה כהן", PhoneNumber: "0547654321", Email: "" });
    expect(req.UniqueId).toBe(id);
    expect(req.Installments).toEqual({ Type: "regular", MinQuantity: 1, MaxQuantity: 6 });
    expect(req.CartItems.reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(priced.order.total);
    // the order's own lines (the product, then its delivery and installation), not one lump
    expect(req.CartItems.length).toBeGreaterThan(1);
    expect(req.CartItems[0].Name).not.toContain("הזמנה");
    expect(new URL(req.CallbackUrl).searchParams.get("total")).toBe(String(priced.order.total));
    const full = (await getOrder(db, id))!;
    expect(full.order).toMatchObject({ paymentLink: "https://pci.zcredit.co.il/webcheckout/s1", zcreditSessionId: "s1" });
    expect(full.events.some((e) => e.text === "נוצר קישור תשלום Z-Credit חדש ללקוח")).toBe(true);
  });

  it("charges the discounted total of an order with a coupon and a phone deal", async () => {
    const { id, priced } = await saved({ coupon: "SALE10", discount: 250 }, parseCoupons("SALE10=10%"));
    const z = zcredit();
    vi.stubGlobal("fetch", z.f);
    await paymentLinkAgainAction(form(id, "1"));
    expect(z.sent[0].CartItems.reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(priced.order.total);
    expect(z.sent[0].CartItems.every((x) => x.Amount > 0)).toBe(true);
    expect(z.sent[0].CartItems.some((x) => x.Description.includes("SALE10"))).toBe(true);
    expect(z.sent[0].Installments).toEqual({ Type: "none", MinQuantity: 1, MaxQuantity: 1 });
  });

  it("logs Z-Credit's refusal in the order's history and keeps no link", async () => {
    const { id } = await saved();
    const z = zcredit({ HasError: true, Data: { HasError: true, ReturnCode: -97, ReturnMessage: "Input Error", SessionUrl: "" } });
    vi.stubGlobal("fetch", z.f);
    await paymentLinkAgainAction(form(id));
    const full = (await getOrder(db, id))!;
    expect(full.order.paymentLink).toBeNull();
    expect(full.events.some((e) => e.text === "יצירת קישור התשלום נכשלה (Z-Credit: Input Error)")).toBe(true);
  });

  it("never asks for a paid order, or one not paid by link", async () => {
    const paid = await saved({ payment: "transfer", paid: true });
    const transfer = await saved({ payment: "transfer" });
    const z = zcredit();
    vi.stubGlobal("fetch", z.f);
    await paymentLinkAgainAction(form(paid.id));
    await paymentLinkAgainAction(form(transfer.id));
    expect(z.sent).toHaveLength(0);
  });
});
