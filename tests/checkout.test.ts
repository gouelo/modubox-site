import { describe, expect, it, vi } from "vitest";
import { cleanSelections, newOrderId, paymentItems, priceCheckout, type PricedOrder } from "../src/lib/checkout";
import { getProduct, products } from "../src/lib/catalog";
import { summarizeCart } from "../src/lib/pricing";
import { CONFIGURATOR_ORIGIN } from "../src/lib/configurator";
import {
  buildCreateSession,
  checkSessionStatus,
  createSession,
  signOrder,
  verifyOrder,
  verifyPayment,
  zcreditConfig,
  ZCREDIT_API,
} from "../src/lib/zcredit";

const customer = { name: "ישראל ישראלי", phone: "052-1234567", email: "a@b.co", city: "חיפה", address: "הרצל 1", notes: "" };
const config = { key: "test-key", terminal: "2071556014" };

function body(items: unknown[], extra: Record<string, unknown> = {}) {
  return { locale: "he", items, customer, installments: 1, ...extra };
}

function priced(b: unknown): PricedOrder {
  const r = priceCheckout(b);
  if (!r.ok) throw new Error(r.error);
  return r.order;
}

describe("priceCheckout: the server's own prices", () => {
  it("prices a product with add-ons and delivery from data/", () => {
    const o = priced(body([{ slug: "modubox-2x2", qty: 1, selections: { "sliding-window": 2, "electric-panel": 1 }, fulfillment: "deliveryAndInstallation" }]));
    expect(o.total).toBe(5990 + 2 * 1190 + 1790 + 900);
  });

  it("ignores any price the browser sends", () => {
    const o = priced(
      body([{ slug: "modubox-2x2", qty: 1, price: 1, total: 1, selections: {}, fulfillment: "deliveryAndInstallation", design: undefined }], { total: 1 }),
    );
    expect(o.total).toBe(5990 + 900);
  });

  it("multiplies by quantity", () => {
    const o = priced(body([{ slug: "modubox-3x2", qty: 2, selections: {}, fulfillment: "deliveryAndInstallation" }]));
    expect(o.total).toBe(2 * (7800 + 1000));
  });

  it("drops negative, fractional and over-limit counts, and unknown add-ons and choices", () => {
    const p = getProduct("modubox-2x2")!;
    const s = cleanSelections(p, { "sliding-window": -3, "electric-panel": 999, "extra-door": 1.5, "glass-wall": "free-glass", bogus: 5 });
    expect(s["sliding-window"]).toBeUndefined();
    expect(s["extra-door"]).toBeUndefined();
    expect(s["electric-panel"]).toBe(10);
    expect(s["glass-wall"]).toBe("none");
    expect(s.bogus).toBeUndefined();
    const o = priced(body([{ slug: "modubox-2x2", qty: 1, selections: { "sliding-window": -3 }, fulfillment: "deliveryAndInstallation" }]));
    expect(o.total).toBe(5990 + 900);
  });

  it("charges installers' delivery on the day, not online", () => {
    const o = priced(body([{ slug: "toilet-1x1", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }]));
    expect(o.total).toBe(4300);
    expect(o.cart.payLater).toBe(800);
  });

  it("an unknown delivery choice falls back to the product's first option", () => {
    const o = priced(body([{ slug: "gilboa-s", qty: 1, selections: {}, fulfillment: "teleport" }]));
    expect(o.total).toBe(2590 + 600);
    const pickup = priced(body([{ slug: "gilboa-s", qty: 1, selections: {}, fulfillment: "pickup" }]));
    expect(pickup.total).toBe(2590);
  });

  it("refuses what can't be paid online", () => {
    expect(priceCheckout(body([]))).toEqual({ ok: false, error: "empty_cart" });
    expect(priceCheckout(body([{ slug: "nope", qty: 1, selections: {}, fulfillment: "pickup" }]))).toEqual({ ok: false, error: "unknown_product" });
    expect(priceCheckout(body([{ slug: "modubox-2x2", qty: 0, selections: {} }]))).toEqual({ ok: false, error: "invalid_request" });
    expect(priceCheckout(body([{ slug: "modubox-2x2", qty: 1, selections: {} }], { customer: { ...customer, phone: "123" } }))).toEqual({ ok: false, error: "invalid_customer" });
    // an add-on priced "בתיאום" (a configurator design's kipp window) can't be paid online either: tests/configurator.test.ts;
    // a product with no delivery price: tests/catalog-overrides.test.ts
    expect(priceCheckout("x")).toEqual({ ok: false, error: "invalid_request" });
  });

  it("prices 6×3 with its delivery and installation (₪2,000) like every other size", () => {
    const o = priced(body([{ slug: "modubox-6x3", qty: 1, selections: { "sliding-window": 1 }, fulfillment: "deliveryAndInstallation" }]));
    expect(o.total).toBe(17900 + 1190 + 2000);
  });

  it("every Modubox shed costs the same in the cart and at the server's checkout", () => {
    for (const p of products.filter((x) => x.category === "modubox")) {
      const item = { slug: p.slug, qty: 1, selections: { "sliding-window": 1, "wpc-floor": "grey" }, fulfillment: "deliveryAndInstallation" as const };
      const cart = summarizeCart([{ id: "1", ...item }], "he");
      expect(cart.hasOnRequest, p.slug).toBe(false);
      expect(cart.fulfillmentTotal, p.slug).toBe(p.fulfillment.deliveryAndInstallation);
      expect(priced(body([item])).total, p.slug).toBe(cart.total);
    }
  });

  it("keeps installments between 1 and 12", () => {
    const item = { slug: "modubox-2x2", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" };
    expect(priced(body([item], { installments: 12 })).installments).toBe(12);
    expect(priced(body([item], { installments: 13 })).installments).toBe(1);
    expect(priced(body([item], { installments: 0 })).installments).toBe(1);
  });

  it("prices a configurator design from its link, not from the browser's extra lines", () => {
    // two glass walls: the builder holds one, the second is an extra line at its price
    const link = `${CONFIGURATOR_ORIGIN}/il?m=3x2&f=d&p=dGG.......`;
    const o = priced(
      body([
        {
          slug: "modubox-3x2",
          qty: 1,
          selections: { "glass-wall": "glass" },
          fulfillment: "deliveryAndInstallation",
          design: { link, exact: true, extras: [{ id: "glass-wall+glass", qty: 1, unitPrice: 1 }] },
        },
      ]),
    );
    const glass = getProduct("modubox-3x2")!;
    expect(o.cart.lines[0].quote.lines.find((l) => l.id === "glass-wall+glass")?.unitPrice).toBeGreaterThan(1);
    expect(o.total).toBe(glass.price + 2 * 1190 + 1000);
  });

  it("a link to another site adds nothing", () => {
    const o = priced(body([{ slug: "modubox-3x2", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation", design: { link: "https://evil.example/il?m=3x2&p=dGGGGGGGGG", exact: true } }]));
    expect(o.total).toBe(7800 + 1000);
  });
});

describe("paymentItems", () => {
  it("adds up to the total, with delivery as its own line and names without direction marks", () => {
    const o = priced(
      body([
        { slug: "modubox-2x2", qty: 2, selections: { "sliding-window": 1 }, fulfillment: "deliveryAndInstallation" },
        { slug: "gilboa-s", qty: 1, selections: {}, fulfillment: "pickup" },
      ]),
    );
    const items = paymentItems(o);
    expect(items.reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(o.total);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ Amount: 5990 + 1190, Quantity: 2, Currency: "ILS" });
    expect(items[1]).toMatchObject({ Amount: 900, Quantity: 2 });
    expect(items.every((x) => !/[⁦-⁩]/.test(x.Name + x.Description))).toBe(true);
  });
});

describe("buildCreateSession", () => {
  const order = priced(body([{ slug: "modubox-2x2", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }], { installments: 6 }));
  const req = buildCreateSession(config, order, "261104123456", "https://modubox.com");

  it("sends the key, terminal, order number and Hebrew", () => {
    expect(req).toMatchObject({ Key: "test-key", TerminalNumber: "2071556014", UniqueId: "261104123456", Local: "He", PaymentType: "regular" });
  });

  it("asks for regular installments only, of the number chosen", () => {
    expect(req.Installments).toEqual({ Type: "regular", MinQuantity: 6, MaxQuantity: 6 });
    const one = buildCreateSession(config, { ...order, installments: 1 }, "1", "https://modubox.com");
    expect(one.Installments).toEqual({ Type: "none", MinQuantity: 1, MaxQuantity: 1 });
  });

  it("keeps Apple Pay and Google Pay on", () => {
    expect(req.ApplePayButtonEnabled).toBe(true);
    expect(req.GooglePayButtonEnabled).toBe(true);
    expect(req.FocusType).toBe("None");
  });

  it("builds the return addresses from the request's origin, with a signed callback", () => {
    expect(req.SuccessUrl).toBe("https://modubox.com/checkout/success/?order=261104123456");
    expect(req.CancelUrl).toBe("https://modubox.com/checkout/failed/?order=261104123456&reason=cancel");
    const cb = new URL(req.CallbackUrl);
    expect(cb.origin + cb.pathname).toBe("https://modubox.com/api/checkout/callback/");
    expect(cb.searchParams.get("total")).toBe(String(5990 + 900));
    expect(verifyOrder("test-key", "261104123456", 5990 + 900, cb.searchParams.get("sig")!)).toBe(true);
    expect(JSON.stringify(req.CallbackUrl)).not.toContain("test-key");
  });

  it("English pages get the English payment page and English return pages", () => {
    const en = buildCreateSession(config, { ...order, locale: "en" }, "9", "https://modubox.com");
    expect(en.Local).toBe("En");
    expect(en.SuccessUrl).toBe("https://modubox.com/en/checkout/success/?order=9");
  });

  it("charges the server's total and passes the customer", () => {
    expect(req.CartItems.reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(5990 + 900);
    expect(req.Customer).toEqual({ Name: customer.name, PhoneNumber: customer.phone, Email: customer.email });
    expect(req.AdditionalText).toBe("Order 261104123456");
    expect(req.CartItems[0].Image).toMatch(/^https:\/\/modubox\.com\/_img\/.+-480\.webp$/);
  });
});

describe("signatures", () => {
  it("fail on another amount, order or key", () => {
    const sig = signOrder("k", "1", 100);
    expect(verifyOrder("k", "1", 100, sig)).toBe(true);
    expect(verifyOrder("k", "1", 99, sig)).toBe(false);
    expect(verifyOrder("k", "2", 100, sig)).toBe(false);
    expect(verifyOrder("other", "1", 100, sig)).toBe(false);
    expect(verifyOrder("k", "1", 100, "")).toBe(false);
  });
});

describe("zcreditConfig", () => {
  it("is null until both env vars are set", () => {
    expect(zcreditConfig({})).toBeNull();
    expect(zcreditConfig({ ZCREDIT_WEBCHECKOUT_KEY: "k" })).toBeNull();
    expect(zcreditConfig({ ZCREDIT_WEBCHECKOUT_KEY: " k ", ZCREDIT_TERMINAL_NUMBER: "2071556014" })).toEqual({ key: "k", terminal: "2071556014" });
  });
});

describe("Z-Credit calls (mocked, never the live terminal)", () => {
  const ok = (json: unknown) => vi.fn(async () => new Response(JSON.stringify(json), { status: 200 })) as unknown as typeof fetch;

  it("createSession posts to CreateSession and reads the wrapped answer", async () => {
    const f = ok({ HasError: false, Data: { HasError: false, ReturnCode: 0, SessionId: "s1", SessionUrl: "https://pci.zcredit.co.il/webcheckout/s1" } });
    const order = priced(body([{ slug: "modubox-2x2", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }]));
    const r = await createSession(buildCreateSession(config, order, "1", "https://x.co"), f);
    expect(r).toEqual({ ok: true, sessionId: "s1", url: "https://pci.zcredit.co.il/webcheckout/s1" });
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${ZCREDIT_API}/CreateSession`);
    expect(JSON.parse(init.body).Key).toBe("test-key");
  });

  it("createSession reports Z-Credit's error", async () => {
    const r = await createSession({} as never, ok({ HasError: true, Data: { HasError: true, ReturnCode: -98001, ReturnMessage: "Key is not valid", SessionUrl: "" } }));
    expect(r).toMatchObject({ ok: false, status: 200, code: -98001, message: "Key is not valid" });
  });

  it("createSession never returns or logs the key", async () => {
    const order = priced(body([{ slug: "modubox-2x2", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }]));
    const req = buildCreateSession(config, order, "1", "https://x.co");
    const r = await createSession(req, ok({ HasError: true, Data: { HasError: true, ReturnCode: -97, ReturnMessage: "bad test-key", RequestData: { Key: "test-key" } } }));
    expect(JSON.stringify(r)).not.toContain("test-key");
    const down = await createSession(req, (async () => new Response("oops", { status: 500 })) as unknown as typeof fetch);
    expect(down).toMatchObject({ ok: false, status: 500, message: "not JSON", body: "oops" });
  });

  const status = (cb: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
    HasError: false,
    ReturnCode: 0,
    TransactionSuccess: true,
    CallBackJSON: JSON.stringify(cb),
    ...extra,
  });

  it("verifyPayment accepts a full regular payment for this order", async () => {
    const f = ok(status({ UniqueID: "7", Total: 6890, J: 0, Installments: 3 }));
    const r = await verifyPayment(config, "s1", "7", 6890, f);
    expect(r.paid).toBe(true);
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${ZCREDIT_API}/GetSessionStatus`);
    expect(JSON.parse(init.body)).toMatchObject({ Key: "test-key", SessionId: "s1" });
  });

  it("verification refuses unpaid, partial, other orders and authorizations", () => {
    expect(checkSessionStatus(status({ UniqueID: "7", Total: 6890 }, { TransactionSuccess: false }), "7", 6890).paid).toBe(false);
    expect(checkSessionStatus(status({ UniqueID: "7", Total: 1 }), "7", 6890).paid).toBe(false);
    expect(checkSessionStatus(status({ UniqueID: "8", Total: 6890 }), "7", 6890).paid).toBe(false);
    expect(checkSessionStatus(status({ UniqueID: "7", Total: 6890, J: 5 }), "7", 6890).paid).toBe(false);
    expect(checkSessionStatus({ HasError: true, ReturnCode: -1 }, "7", 6890).paid).toBe(false);
  });
});

describe("newOrderId", () => {
  it("is the date and six digits, letters and digits only", () => {
    expect(newOrderId(new Date("2026-11-04T10:00:00Z"), () => 0.0421)).toBe("261104042100");
    expect(newOrderId()).toMatch(/^\d{12}$/);
  });
});
