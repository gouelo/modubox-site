import { describe, expect, it } from "vitest";
import testFile from "../data/test-product.json";
import { paymentItems, priceCart, priceCheckout } from "../src/lib/checkout";
import { catalog, getProduct, productPath, TEST_SLUG } from "../src/lib/catalog";
import { applyCoupon, israelToday, parseCoupons } from "../src/lib/coupons";
import { summarizeCart } from "../src/lib/pricing";
import { buildCreateSession } from "../src/lib/zcredit";
import sitemap from "../src/app/sitemap";

const customer = { name: "ישראל ישראלי", phone: "052-1234567", email: "", city: "חיפה", address: "הרצל 1", notes: "" };
const shed = { slug: "modubox-2x2", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }; // 5,990 + 900 delivery
const coupons = parseCoupons("PINUK10=10%; SALE500=500;VIP15=15%,min=10000,until=2026-12-31\nHOVALA=900,delivery ; FREE=100%");
const today = "2026-11-04";

describe("parseCoupons: the MODUBOX_COUPONS format", () => {
  it("reads percent and fixed codes with their options", () => {
    expect(coupons.get("PINUK10")).toEqual({ code: "PINUK10", kind: "percent", value: 10, delivery: false });
    expect(coupons.get("SALE500")).toEqual({ code: "SALE500", kind: "fixed", value: 500, delivery: false });
    expect(coupons.get("VIP15")).toEqual({ code: "VIP15", kind: "percent", value: 15, min: 10000, until: "2026-12-31", delivery: false });
    expect(coupons.get("HOVALA")?.delivery).toBe(true);
  });

  it("is forgiving about case, spaces and ₪, and skips what it can't read", () => {
    const c = parseCoupons(" pinuk = 10 % ;A=300₪;bad;B=0;C=150%;D=10%,soon=1;E=5,min=abc;;");
    expect([...c.keys()]).toEqual(["PINUK", "A"]);
    expect(c.get("PINUK")).toMatchObject({ kind: "percent", value: 10 });
    expect(c.get("A")).toMatchObject({ kind: "fixed", value: 300 });
    expect(parseCoupons("x=10%").get("X")?.value).toBe(10);
    expect(parseCoupons(undefined).size).toBe(0);
    expect(parseCoupons("").size).toBe(0);
  });
});

describe("applyCoupon", () => {
  const cart = summarizeCart([{ id: "1", ...shed, fulfillment: "deliveryAndInstallation" }]);

  it("takes a percent of the products only, by default", () => {
    expect(applyCoupon("pinuk10", coupons, cart, today)).toEqual({ ok: true, coupon: { code: "PINUK10", amount: 599, delivery: false } });
  });

  it("takes a fixed amount", () => {
    expect(applyCoupon("SALE500", coupons, cart, today)).toMatchObject({ ok: true, coupon: { amount: 500 } });
  });

  it("covers delivery and installation only with `delivery`", () => {
    expect(applyCoupon("HOVALA", coupons, cart, today)).toMatchObject({ ok: true, coupon: { amount: 900, delivery: true } });
    const pct = parseCoupons("ALL10=10%,delivery");
    expect(applyCoupon("ALL10", pct, cart, today)).toMatchObject({ ok: true, coupon: { amount: 689 } });
  });

  it("refuses unknown, expired and too-small orders", () => {
    expect(applyCoupon("NOPE", coupons, cart, today)).toEqual({ ok: false, error: "unknown" });
    expect(applyCoupon("VIP15", coupons, cart, today)).toEqual({ ok: false, error: "min_order", min: 10000 });
    const big = summarizeCart([{ id: "1", slug: "modubox-4x3", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }]);
    expect(applyCoupon("VIP15", coupons, big, "2026-12-31")).toMatchObject({ ok: true });
    expect(applyCoupon("VIP15", coupons, big, "2027-01-01")).toEqual({ ok: false, error: "expired" });
  });

  it("never leaves less than 1 ₪ to pay", () => {
    const r = applyCoupon("FREE", coupons, cart, today);
    expect(r.ok && cart.total - r.coupon.amount).toBe(900);
    const all = parseCoupons("ALL=100%,delivery;BIG=99999,delivery");
    for (const code of ["ALL", "BIG"]) {
      const x = applyCoupon(code, all, cart, today);
      expect(x.ok && cart.total - x.coupon.amount).toBe(1);
    }
  });

  it("with no coupons set, every code is invalid", () => {
    expect(applyCoupon("PINUK10", parseCoupons(undefined), cart, today)).toEqual({ ok: false, error: "unknown" });
  });

  it("israelToday is Israel's date", () => {
    expect(israelToday(new Date("2026-12-31T22:30:00Z"))).toBe("2027-01-01");
  });
});

describe("coupons in the server's pricing", () => {
  const body = (coupon?: string, items = [shed]) => ({ locale: "he", items, customer, installments: 1, ...(coupon ? { coupon } : {}) });

  it("charges the total less the discount", () => {
    const r = priceCheckout(body("PINUK10"), { coupons, today });
    expect(r.ok && r.order.total).toBe(6890 - 599);
    expect(r.ok && r.order.coupon).toEqual({ code: "PINUK10", amount: 599, delivery: false });
  });

  it("a bad code stops the payment with its reason", () => {
    expect(priceCheckout(body("NOPE"), { coupons, today })).toEqual({ ok: false, error: "invalid_coupon", coupon: { error: "unknown" } });
    expect(priceCart(body("VIP15"), { coupons, today })).toEqual({ ok: false, error: "invalid_coupon", coupon: { error: "min_order", min: 10000 } });
    expect(priceCheckout(body("PINUK10"))).toEqual({ ok: false, error: "invalid_coupon", coupon: { error: "unknown" } });
  });

  it("no code: no discount", () => {
    const r = priceCheckout(body(), { coupons, today });
    expect(r.ok && r.order.total).toBe(6890);
    expect(r.ok && r.order.coupon).toBeNull();
  });

  it("Z-Credit's lines still add up, with no negative line", () => {
    const items = [
      { ...shed, qty: 2, selections: { "sliding-window": 1 } },
      { slug: "gilboa-s", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" },
    ];
    for (const code of ["PINUK10", "SALE500", "HOVALA", "FREE"]) {
      const r = priceCheckout(body(code, items), { coupons, today });
      if (!r.ok) throw new Error(r.error);
      const lines = paymentItems(r.order);
      expect(lines.reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(r.order.total);
      expect(lines.every((x) => x.Amount >= 0 && Number.isInteger(x.Amount))).toBe(true);
      expect(lines.some((x) => x.Description.includes(`קופון ${code}`))).toBe(true);
      expect(lines.every((x) => !("isDelivery" in x))).toBe(true);
    }
    // products-only coupon leaves delivery lines whole
    const r = priceCheckout(body("SALE500", items), { coupons, today });
    const lines = r.ok ? paymentItems(r.order) : [];
    expect(lines.find((x) => x.Name.startsWith("הובלה והתקנה"))?.Amount).toBe(900);
  });

  it("the session request carries the discounted total and the code", () => {
    const r = priceCheckout(body("SALE500"), { coupons, today });
    if (!r.ok) throw new Error(r.error);
    const req = buildCreateSession({ key: "k", terminal: "t" }, r.order, "1", "https://x.co");
    expect(req.CartItems.reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(6390);
    expect(new URL(req.CallbackUrl).searchParams.get("total")).toBe("6390");
    expect(req.AdditionalText).toBe("Order 1 coupon SALE500 minus 500");
  });
});

describe("the hidden test product", () => {
  it("is found by its slug only, and costs exactly 1 ₪ with nothing for delivery", () => {
    expect(testFile.enabled).toBe(true);
    expect(TEST_SLUG).toMatch(/^test-[a-z0-9]{8,}$/);
    const r = priceCheckout({ locale: "he", items: [{ slug: TEST_SLUG, qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }], customer, installments: 1 });
    expect(r.ok && r.order.total).toBe(1);
    const lines = r.ok ? paymentItems(r.order) : [];
    expect(lines).toEqual([expect.objectContaining({ Amount: 1, Quantity: 1 })]);
    expect(getProduct(TEST_SLUG, "en")?.name).toMatch(/Test product/);
    expect(productPath(getProduct(TEST_SLUG)!)).toBe(`/p/${TEST_SLUG}/`);
  });

  it("is in no list: catalog, sitemap or configurator", async () => {
    for (const locale of ["he", "en"] as const) expect(catalog(locale).products.some((p) => p.slug === TEST_SLUG)).toBe(false);
    expect((await sitemap()).some((e) => e.url.includes(TEST_SLUG))).toBe(false);
  });
});
