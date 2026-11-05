import { describe, expect, it, vi } from "vitest";

// a build with published changes: what scripts/catalog-sync.mjs would write
vi.mock("../data/catalog-overrides.json", () => ({
  default: {
    generatedAt: "2026-11-04T12:00:00Z",
    products: {
      "modubox-2x1": { price: 4500, fulfillment: { deliveryAndInstallation: 800 }, addonPriceOverrides: { "sliding-window": 999 }, en: { name: "Modubox 2×1 (new)" } },
      "modubox-1x1": { hidden: true },
      "modubox-3x1": { fulfillment: { deliveryAndInstallation: null } },
      "modubox-7x3": { copiedFrom: "modubox-3x3", name: "מחסן מודובוקס 7×3", price: 19990, sizeLabel: "7×3", widthM: 7, depthM: 3, areaM2: 18 },
    },
    addons: { "extra-door": { price: 1290, en: { name: "Another door" } }, "glass-wall": { choices: { glass: { price: 1290 } } } },
  },
}));

const { catalog, getProduct, addonsFor, products } = await import("@/lib/catalog");
const { fulfillmentOptions, summarizeCart } = await import("@/lib/pricing");
const { priceCheckout } = await import("@/lib/checkout");

const customer = { name: "בדיקה", phone: "0501234567", city: "עפולה", address: "הרצל 1", notes: "", email: "" };

describe("published catalog changes", () => {
  it("change prices, delivery, add-ons and English texts", () => {
    const p = getProduct("modubox-2x1")!;
    expect(p.price).toBe(4500);
    expect(p.fulfillment.deliveryAndInstallation).toBe(800);
    expect(p.fulfillment.note).toBeTruthy();
    expect(addonsFor(p).find((a) => a.id === "sliding-window")?.price).toBe(999);
    expect(addonsFor(p).find((a) => a.id === "extra-door")?.price).toBe(1290);
    expect(addonsFor(p).find((a) => a.id === "glass-wall")?.choices?.find((c) => c.id === "glass")?.price).toBe(1290);
    expect(getProduct("modubox-2x1", "en")?.name).toBe("Modubox 2×1 (new)");
    expect(catalog("en").addonById.get("extra-door")?.name).toBe("Another door");
  });

  it("hide a product and add a copy after its original", () => {
    expect(getProduct("modubox-1x1")).toBeUndefined();
    const i = products.findIndex((p) => p.slug === "modubox-3x3");
    expect(products[i + 1].slug).toBe("modubox-7x3");
    const copy = getProduct("modubox-7x3")!;
    expect(copy).toMatchObject({ price: 19990, widthM: 7, category: "modubox" });
    expect(copy.oldUrl).toBeUndefined();
    expect(getProduct("modubox-7x3", "en")?.name).toBeTruthy();
  });

  it("the cart and the server's checkout price the same", () => {
    const items = [{ id: "1", slug: "modubox-2x1", qty: 1, selections: { "sliding-window": 1, "extra-door": 1 }, fulfillment: "deliveryAndInstallation" as const }];
    const cart = summarizeCart(items, "he");
    expect(cart.itemsTotal).toBe(4500 + 999 + 1290);
    const priced = priceCheckout({ locale: "he", items: items.map(({ id: _id, ...i }) => i), customer, installments: 1 });
    expect(priced.ok).toBe(true);
    if (priced.ok) expect(priced.order.total).toBe(cart.total);
    // no delivery price: "בתיאום", and no online payment
    expect(fulfillmentOptions(getProduct("modubox-3x1")!)[0].price).toBeNull();
    expect(priceCheckout({ locale: "he", items: [{ slug: "modubox-3x1", qty: 1, selections: {} }], customer, installments: 1 })).toEqual({ ok: false, error: "price_on_request" });
    const hidden = priceCheckout({ locale: "he", items: [{ slug: "modubox-1x1", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }], customer, installments: 1 });
    expect(hidden.ok).toBe(false);
  });
});
