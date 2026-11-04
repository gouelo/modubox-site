import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db";
import { testDb } from "./db";

// The checkout routes with a real (in-memory) database: the order is saved when
// the payment page is made, and the verified callback marks it paid and emails.
let db: Db;
vi.mock("@/db", () => ({ getDb: () => db }));

const { POST: checkout } = await import("../src/app/api/checkout/route.api");
const { POST: callback } = await import("../src/app/api/checkout/callback/route.api");
const { getOrder } = await import("../src/lib/orders");

const customer = { name: "ישראל ישראלי", phone: "052-1234567", email: "a@b.co", city: "חיפה", address: "הרצל 1", notes: "" };
const env = { ZCREDIT_WEBCHECKOUT_KEY: "test-key", ZCREDIT_TERMINAL_NUMBER: "2071556014", RESEND_API_KEY: "re_test", ORDER_EMAIL_TO: "sales@example.com" };

beforeEach(async () => {
  db = await testDb();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("checkout → callback → admin", () => {
  it("saves the order at checkout, marks it paid on the verified callback, emails once", async () => {
    const calls: { url: string; body: string }[] = [];
    let createBody: { UniqueId: string; CallbackUrl: string } | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, body: String(init.body) });
        if (url.endsWith("/CreateSession")) {
          createBody = JSON.parse(String(init.body));
          return Response.json({ HasError: false, Data: { SessionId: "sess-1", SessionUrl: "https://pci.zcredit.co.il/pay/sess-1" } });
        }
        if (url.endsWith("/GetSessionStatus")) {
          const total = Number(new URL(createBody!.CallbackUrl).searchParams.get("total"));
          return Response.json({ HasError: false, TransactionSuccess: true, CallBackJSON: JSON.stringify({ UniqueID: createBody!.UniqueId, Total: total, J: 0, ReferenceNumber: "REF9", Installments: 2, PaymentMethod: 0, CardName: "Visa", CardNum: "4580" }) });
        }
        if (url === "https://api.resend.com/emails") return Response.json({ id: "email-1" });
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    const res = await checkout(
      new Request("https://modubox.test/api/checkout/", {
        method: "POST",
        body: JSON.stringify({ locale: "he", items: [{ slug: "modubox-2x2", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }], customer, installments: 2 }),
      }),
    );
    expect(res.status).toBe(200);
    const { orderId } = (await res.json()) as { orderId: string };
    expect((await getOrder(db, orderId))!.order).toMatchObject({ status: "pending_payment", total: 5990 + 900, zcreditSessionId: "sess-1" });

    const post = () => callback(new Request(createBody!.CallbackUrl, { method: "POST", body: JSON.stringify({ SessionId: "sess-1" }) }));
    expect((await post()).status).toBe(200);
    // Z-Credit retries: still paid once, one email
    expect((await post()).status).toBe(200);

    const full = (await getOrder(db, orderId))!;
    expect(full.order).toMatchObject({ status: "new", zcreditReference: "REF9", paidInstallments: 2, card: "Visa 4580" });
    expect(full.order.notifiedAt).not.toBeNull();
    const emails = calls.filter((c) => c.url === "https://api.resend.com/emails");
    expect(emails).toHaveLength(1);
    expect(JSON.parse(emails[0].body)).toMatchObject({ to: ["sales@example.com"], reply_to: "a@b.co" });
    expect(JSON.parse(emails[0].body).html).toContain(`https://modubox.test/admin/orders/${orderId}/`);
  });

  it("a late callback for an order deleted in the admin answers 200, sends nothing and doesn't make it again", async () => {
    const { deleteOrders } = await import("../src/lib/orders");
    let createBody: { UniqueId: string; CallbackUrl: string } | undefined;
    const emails: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (url.endsWith("/CreateSession")) {
          createBody = JSON.parse(String(init.body));
          return Response.json({ HasError: false, Data: { SessionId: "sess-2", SessionUrl: "https://pci.zcredit.co.il/pay/sess-2" } });
        }
        if (url.endsWith("/GetSessionStatus")) {
          const total = Number(new URL(createBody!.CallbackUrl).searchParams.get("total"));
          return Response.json({ HasError: false, TransactionSuccess: true, CallBackJSON: JSON.stringify({ UniqueID: createBody!.UniqueId, Total: total, J: 0, ReferenceNumber: "REF10", Installments: 1, PaymentMethod: 0 }) });
        }
        if (url === "https://api.resend.com/emails") return emails.push(String(init.body)), Response.json({ id: "email-2" });
        throw new Error(`unexpected fetch ${url}`);
      }),
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await checkout(new Request("https://modubox.test/api/checkout/", { method: "POST", body: JSON.stringify({ locale: "he", items: [{ slug: "modubox-2x2", qty: 1, selections: {}, fulfillment: "pickup" }], customer, installments: 1 }) }));
    const { orderId } = (await res.json()) as { orderId: string };
    expect(await deleteOrders(db, [orderId])).toBe(1);
    const late = await callback(new Request(createBody!.CallbackUrl, { method: "POST", body: JSON.stringify({ SessionId: "sess-2" }) }));
    expect(late.status).toBe(200);
    expect(await getOrder(db, orderId)).toBeNull();
    expect(emails).toHaveLength(0);
  });

  it("a callback with a bad signature changes nothing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await callback(new Request("https://modubox.test/api/checkout/callback/?order=1&total=1&sig=bad", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });
});
