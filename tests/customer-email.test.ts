import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db";
import { priceCheckout } from "../src/lib/checkout";
import { getOrder, recordPayment, saveNewOrder } from "../src/lib/orders";
import { customerEmailConfig, customerOrderEmail, emailConfig } from "../src/lib/notify";
import { he } from "../src/i18n/he";
import { testDb } from "./db";

// The confirmation email to the customer when an order is paid.
let db: Db;
vi.mock("@/db", () => ({ getDb: () => db }));
const { orderPaid } = await import("../src/lib/order-events");

const customer = { name: "דנה כהן", phone: "052-1234567", email: "dana@example.com", city: "חיפה", address: "הרצל 1", notes: "שער אחורי" };
const paidData = { ReferenceNumber: "REF-1", PaymentMethod: 0, CardName: "Visa", CardNum: "1234", Installments: 3 };
const env = { RESEND_API_KEY: "re_test", ORDER_EMAIL_TO: "sales@example.com", MAIL_FROM: "Modubox <orders@send.modubox.test>" };

function priced() {
  const r = priceCheckout(
    {
      locale: "he",
      items: [{ slug: "modubox-2x2", qty: 1, selections: { "sliding-window": 2 }, fulfillment: "deliveryAndInstallation" }],
      customer,
      installments: 3,
      coupon: "SALE10",
    },
    { coupons: new Map([["SALE10", { code: "SALE10", kind: "percent", value: 10 }]]) as never },
  );
  if (!r.ok) throw new Error(r.error);
  return r.order;
}

async function paidOrder(id: string) {
  const o = priced();
  await saveNewOrder(db, id, "s", o);
  await recordPayment(db, { orderId: id, total: o.total, sessionId: "s", data: paidData });
  return o;
}

function stubResend(fail?: (to: string[]) => boolean) {
  const sent: { from: string; to: string[]; subject: string; html: string; text: string; reply_to?: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (url !== "https://api.resend.com/emails") throw new Error(`unexpected fetch ${url}`);
      const body = JSON.parse(String(init.body));
      if (fail?.(body.to)) return new Response('{"message":"You can only send testing emails to your own email address"}', { status: 403 });
      sent.push(body);
      return Response.json({ id: `email-${sent.length}` });
    }),
  );
  return sent;
}

beforeEach(async () => {
  db = await testDb();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the customer's confirmation email", () => {
  it("says thanks, the order number, what was bought, what happens next and how to reach us", async () => {
    await paidOrder("261104000101");
    const full = (await getOrder(db, "261104000101"))!;
    const m = customerOrderEmail(full, "https://www.modubox.test");
    expect(m.subject).toContain("261104000101");
    expect(m.html).toContain('dir="rtl"');
    expect(m.html).toContain("https://www.modubox.test/brand/logo-white-email.png");
    for (const part of [m.html, m.text]) {
      expect(part).toContain("קיבלנו את ההזמנה שלך, תודה!");
      expect(part).toContain("#261104000101");
      expect(part).toContain("SALE10");
      expect(part).toContain("3 תשלומים");
      expect(part).toContain("הרצל 1, חיפה");
      expect(part).toContain("דנה כהן");
      for (const s of he.payment.next) expect(part).toContain(s);
      expect(part).toContain("בעותק פיזי ביום ההתקנה");
      expect(part).toContain("072-3954739");
      expect(part).toContain("052-9555057");
    }
    expect(m.text).toContain(full.items[0].productName);
    expect(m.text).toContain(full.items[0].fulfillmentLabel);
    expect(full.items[0].addons.length).toBeGreaterThan(0);
    for (const a of full.items[0].addons) expect(m.text).toContain(a.label);
    expect(m.text).toContain("https://www.modubox.test/");
    expect(m.html).toContain("tel:+972723954739");
    expect(m.html).toContain("https://wa.me/972529555057");
  });

  it("escapes what the customer typed", async () => {
    await saveNewOrder(db, "261104000102", "s", { ...priced(), customer: { ...customer, name: '<b>"x"</b>' } });
    const m = customerOrderEmail((await getOrder(db, "261104000102"))!, "https://x.test");
    expect(m.html).not.toContain("<b>\"x\"</b>");
    expect(m.html).toContain("&lt;b&gt;");
  });

  it("is sent once, beside the business email, however many times the payment is confirmed", async () => {
    const sent = stubResend();
    await paidOrder("261104000103");
    await orderPaid({ orderId: "261104000103", total: priced().total, sessionId: "s", data: paidData }, "https://www.modubox.test");
    await orderPaid({ orderId: "261104000103", total: priced().total, sessionId: "s", data: paidData }, "https://www.modubox.test");
    expect(sent.map((e) => e.to)).toEqual([["sales@example.com"], ["dana@example.com"]]);
    expect(sent[1]).toMatchObject({ from: "Modubox <orders@send.modubox.test>", reply_to: "sales@example.com" });
    const { events } = (await getOrder(db, "261104000103"))!;
    expect(events.filter((e) => e.kind === "email").map((e) => e.text)).toEqual(["נשלח מייל לעסק על ההזמנה (אל sales@example.com)", "נשלח מייל אישור הזמנה ללקוח (אל dana@example.com)"]);
  });

  it("a refused customer email is logged and never fails the payment or resends the business email", async () => {
    const sent = stubResend((to) => to.includes("dana@example.com"));
    await paidOrder("261104000104");
    await expect(orderPaid({ orderId: "261104000104", total: priced().total, sessionId: "s", data: paidData }, "https://x.test")).resolves.toBeUndefined();
    await orderPaid({ orderId: "261104000104", total: priced().total, sessionId: "s", data: paidData }, "https://x.test");
    expect(sent.map((e) => e.to)).toEqual([["sales@example.com"]]);
    expect(console.error).toHaveBeenCalledWith("[orders] customer email failed", expect.objectContaining({ orderId: "261104000104" }));
  });

  it("without MAIL_FROM the customer email is skipped (logged), and the business email still goes from onboarding@resend.dev", async () => {
    vi.stubEnv("MAIL_FROM", "");
    const sent = stubResend();
    await paidOrder("261104000105");
    await orderPaid({ orderId: "261104000105", total: priced().total, sessionId: "s", data: paidData }, "https://x.test");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: ["sales@example.com"], from: "Modubox <onboarding@resend.dev>" });
    expect(console.info).toHaveBeenCalledWith("[orders] customer email skipped", expect.objectContaining({ reason: expect.stringContaining("MAIL_FROM") }));
  });

  it("a failed business email is tried again with the customer's, and each goes once", async () => {
    let down = true;
    const sent = stubResend((to) => down && to.includes("sales@example.com"));
    await paidOrder("261104000106");
    await orderPaid({ orderId: "261104000106", total: priced().total, sessionId: "s", data: paidData }, "https://x.test");
    expect(sent).toHaveLength(0);
    down = false;
    await orderPaid({ orderId: "261104000106", total: priced().total, sessionId: "s", data: paidData }, "https://x.test");
    await orderPaid({ orderId: "261104000106", total: priced().total, sessionId: "s", data: paidData }, "https://x.test");
    expect(sent.map((e) => e.to)).toEqual([["sales@example.com"], ["dana@example.com"]]);
  });

  it("without ORDER_EMAIL_TO the customer still gets it, and the order's history and the logs say the business wasn't emailed", async () => {
    vi.stubEnv("ORDER_EMAIL_TO", "");
    const sent = stubResend();
    await paidOrder("261104000108");
    await orderPaid({ orderId: "261104000108", total: priced().total, sessionId: "s", data: paidData }, "https://x.test");
    expect(sent.map((e) => e.to)).toEqual([["dana@example.com"]]);
    expect(console.warn).toHaveBeenCalledWith("[orders] business email skipped: ORDER_EMAIL_TO is missing or invalid", expect.objectContaining({ orderId: "261104000108" }));
    const { events } = (await getOrder(db, "261104000108"))!;
    expect(events.filter((e) => e.kind === "email").map((e) => e.text)).toEqual(["לא נשלח מייל לעסק: ORDER_EMAIL_TO לא מוגדר ב־Vercel", "נשלח מייל אישור הזמנה ללקוח (אל dana@example.com)"]);
  });

  it("goes without the business address set, and not without an email or for a partial order", async () => {
    await paidOrder("261104000107");
    const full = (await getOrder(db, "261104000107"))!;
    expect(customerEmailConfig(full, { RESEND_API_KEY: "k", MAIL_FROM: "M <o@x.test>" })).toMatchObject({ ok: true, config: { to: ["dana@example.com"] } });
    expect(customerEmailConfig({ ...full, order: { ...full.order, customerEmail: null } }, env)).toMatchObject({ ok: false });
    expect(customerEmailConfig({ ...full, order: { ...full.order, partial: true } }, env)).toMatchObject({ ok: false });
    expect(emailConfig({ RESEND_API_KEY: "k", ORDER_EMAIL_TO: "a@b.co", MAIL_FROM: "M <o@x.test>" })?.from).toBe("M <o@x.test>");
  });
});
