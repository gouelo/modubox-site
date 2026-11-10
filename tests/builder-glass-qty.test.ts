import { describe, expect, it } from "vitest";
import { ecommerce } from "../src/lib/analytics";
import { builderSteps, chosenIn } from "../src/lib/builder";
import { cartRequest, cleanSelections, paymentItems, priceCheckout, type PricedOrder } from "../src/lib/checkout";
import { addonsFor, getProduct } from "../src/lib/catalog";
import { CONFIGURATOR_ORIGIN, designToCartItem, parseDesign } from "../src/lib/configurator";
import { orderRows } from "../src/lib/orders";
import { builderVariantQty, defaultSelections, lineAddonId, quote, summarizeCart, variantKey, variantMax } from "../src/lib/pricing";
import type { CartItem, Selections } from "../src/lib/types";
import { configMessage } from "../src/lib/whatsapp";

const p = getProduct("modubox-3x2")!;
const glassWall = addonsFor(p).find((a) => a.id === "glass-wall")!;
const customer = { name: "ישראל ישראלי", phone: "052-1234567", email: "a@b.co", city: "חיפה", address: "הרצל 1", notes: "" };

/** What the product page's builder holds after "+" twice on the plain glass wall and once on the one with a shutter. */
const twoAndOne: Selections = { ...defaultSelections(p), [variantKey(glassWall, "glass")]: 2, [variantKey(glassWall, "glass-shutter")]: 1 };
const item = (selections: Selections, qty = 1): CartItem => ({ id: "a", slug: p.slug, qty, selections, fulfillment: "deliveryAndInstallation" });

function priced(items: CartItem[]): PricedOrder {
  const r = priceCheckout({ ...cartRequest(items, "he"), customer, installments: 1 });
  if (!r.ok) throw new Error(r.error);
  return r.order;
}

describe("glass walls by the unit in the product page's builder", () => {
  it("is offered on the glass wall only, up to 6 of each option", () => {
    const byUnit = addonsFor(p).filter(builderVariantQty).map((a) => a.id);
    expect(byUnit).toEqual(["glass-wall"]);
    expect(variantMax(glassWall)).toBe(6);
    expect(glassWall.choices?.map((c) => c.id)).toEqual(["none", "glass", "glass-shutter"]);
  });

  it("counts the step as chosen, and a summary line jumps to its add-on's step", () => {
    const openings = builderSteps(p).find((s) => s.id === "openings")!;
    expect(chosenIn(openings, twoAndOne)).toBe(1);
    expect(lineAddonId("glass-wall+glass-shutter")).toBe("glass-wall");
    expect(lineAddonId("sliding-window")).toBe("sliding-window");
  });

  it("prices each option times its quantity, in the builder and the cart", () => {
    const q = quote(p, twoAndOne);
    expect(q.lines.filter((l) => l.id.startsWith("glass-wall"))).toEqual([
      { id: "glass-wall+glass", label: "קיר זכוכית ויטרינה: ויטרינה – זכוכית כפולה מבודדת", qty: 2, unitPrice: 1190, total: 2380 },
      { id: "glass-wall+glass-shutter", label: "קיר זכוכית ויטרינה: ויטרינה + תריס ונציאני מובנה", qty: 1, unitPrice: 1990, total: 1990 },
    ]);
    expect(q.total).toBe(p.price + 2 * 1190 + 1990);
    expect(summarizeCart([item(twoAndOne, 2)]).itemsTotal).toBe(2 * q.total);
  });

  it("is priced again on the server to the same total, and the server keeps the limit", () => {
    const cart = summarizeCart([item(twoAndOne)]);
    const o = priced([item(twoAndOne)]);
    expect(o.total).toBe(cart.total);
    expect(o.cart.lines[0].quote.lines.find((l) => l.id === "glass-wall+glass")).toMatchObject({ qty: 2, total: 2380 });
    expect(cleanSelections(p, { "glass-wall+glass": 40 })["glass-wall+glass"]).toBe(6);
    expect(cleanSelections(p, { "glass-wall+glass": -2 })["glass-wall+glass"]).toBeUndefined();
  });

  it("matches the 3D configurator's link with the same glass walls: lines, labels and total", () => {
    const link = `${CONFIGURATOR_ORIGIN}/il?m=3x2&f=l&p=.dGGs.....`;
    const cfg = designToCartItem(parseDesign(link), link)!;
    expect(cfg.product.slug).toBe(p.slug);
    const fromConfigurator = quote(cfg.product, cfg.selections, cfg.design.extras);
    const fromBuilder = quote(p, twoAndOne);
    expect(fromBuilder.total).toBe(fromConfigurator.total);
    const glass = (q: typeof fromBuilder) =>
      q.lines.filter((l) => l.label.startsWith(glassWall.name)).reduce<Record<string, number>>((m, l) => ({ ...m, [l.label]: (m[l.label] ?? 0) + l.qty }), {});
    expect(glass(fromBuilder)).toEqual(glass(fromConfigurator));
  });

  it("carries the quantity into Z-Credit's lines, GA4, the order record and WhatsApp", () => {
    const o = priced([item(twoAndOne)]);
    const pay = paymentItems(o);
    expect(pay[0].Description).toContain("ויטרינה – זכוכית כפולה מבודדת ×2");
    expect(pay[0].Description).toContain("ויטרינה + תריס ונציאני מובנה");
    expect(pay.reduce((s, x) => s + x.Amount * x.Quantity, 0)).toBe(o.total);

    expect(ecommerce(o.cart).items[0]).toMatchObject({ item_id: p.slug, price: p.price + 2 * 1190 + 1990, quantity: 1 });

    const rows = orderRows("261110000001", "s", o);
    expect(rows.items[0].addons).toEqual(
      expect.arrayContaining([
        { label: "קיר זכוכית ויטרינה: ויטרינה – זכוכית כפולה מבודדת", qty: 2, unitPrice: 1190, total: 2380 },
        { label: "קיר זכוכית ויטרינה: ויטרינה + תריס ונציאני מובנה", qty: 1, unitPrice: 1990, total: 1990 },
      ]),
    );
    expect(configMessage(p, quote(p, twoAndOne))).toContain("ויטרינה – זכוכית כפולה מבודדת ×2");
  });

  it("reads in English with the same prices", () => {
    const en = getProduct("modubox-3x2", "en")!;
    const q = quote(en, twoAndOne);
    expect(q.lines.find((l) => l.id === "glass-wall+glass")).toMatchObject({ label: "Glass wall: Glass wall – insulated double glazing", qty: 2, total: 2380 });
    expect(q.total).toBe(quote(p, twoAndOne).total);
  });
});
