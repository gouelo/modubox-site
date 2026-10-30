import { describe, expect, it } from "vitest";
import { addonsFor, getProduct } from "../src/lib/catalog";
import { defaultSelections, fulfillmentOptions, quote, summarizeCart } from "../src/lib/pricing";

const p22 = getProduct("modubox-2x2")!;

describe("quote", () => {
  it("starts at the base price", () => {
    const q = quote(p22, defaultSelections(p22));
    expect(q.total).toBe(5990);
    expect(q.lines).toHaveLength(1);
  });

  it("adds qty, toggle and choice add-ons", () => {
    const q = quote(p22, {
      ...defaultSelections(p22),
      "sliding-window": 2,
      "electric-panel": 1,
      "glass-wall": "glass-shutter",
      ac: "tornado-12",
    });
    expect(q.total).toBe(5990 + 2 * 1190 + 1790 + 1990 + 1400);
  });

  it("free colour choice shows as a line with no cost", () => {
    const q = quote(p22, { ...defaultSelections(p22), "profile-color": "black" });
    expect(q.total).toBe(5990);
    expect(q.lines.find((l) => l.id === "profile-color")?.total).toBe(0);
  });

  it("keeps price-on-request add-ons out of the total", () => {
    const onRequest = { ...p22, addonPriceOverrides: { "electric-panel": null as unknown as number } };
    const q = quote(onRequest, { ...defaultSelections(p22), "electric-panel": 1 });
    expect(q.total).toBe(5990);
    expect(q.onRequest.map((l) => l.id)).toEqual(["electric-panel"]);
  });

  it("applies per-product add-on price overrides", () => {
    const cheap = { ...p22, addonPriceOverrides: { "vent-grill": 150 } };
    expect(addonsFor(cheap).find((a) => a.id === "vent-grill")?.price).toBe(150);
    expect(quote(cheap, { "vent-grill": 2 }).total).toBe(5990 + 300);
  });

  it("hides the double door on sheds narrower than 2 m", () => {
    expect(addonsFor(getProduct("modubox-1x1")!).some((a) => a.id === "double-door")).toBe(false);
    expect(addonsFor(p22).some((a) => a.id === "double-door")).toBe(true);
  });
});

describe("fulfillment", () => {
  it("modubox sheds offer delivery + installation at the real price", () => {
    expect(fulfillmentOptions(p22)).toEqual([
      expect.objectContaining({ id: "deliveryAndInstallation", price: 900 }),
    ]);
  });

  it("gilboa offers install, delivery only and pickup", () => {
    const opts = fulfillmentOptions(getProduct("gilboa-l")!);
    expect(opts.map((o) => [o.id, o.price])).toEqual([
      ["deliveryAndInstallation", 800],
      ["delivery", 300],
      ["pickup", 0],
    ]);
  });

  it("unknown delivery price becomes 'on request'", () => {
    expect(fulfillmentOptions(getProduct("modubox-6x3")!)[0].price).toBeNull();
  });
});

describe("cart", () => {
  it("sums items, delivery and pay-to-installer separately", () => {
    const cart = summarizeCart([
      { id: "a", slug: "modubox-2x2", qty: 2, selections: { "vent-grill": 1 }, fulfillment: "deliveryAndInstallation" },
      { id: "b", slug: "gilboa-s", qty: 1, selections: {}, fulfillment: "pickup" },
      { id: "c", slug: "toilet-1x1", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" },
    ]);
    expect(cart.itemsTotal).toBe(2 * (5990 + 190) + 2590 + 4300);
    expect(cart.fulfillmentTotal).toBe(2 * 900);
    expect(cart.payLater).toBe(800);
    expect(cart.total).toBe(cart.itemsTotal + 1800);
    expect(cart.count).toBe(4);
  });

  it("ignores items whose product was removed from the catalog", () => {
    expect(summarizeCart([{ id: "x", slug: "gone", qty: 1, selections: {}, fulfillment: "pickup" }]).lines).toHaveLength(0);
  });
});
