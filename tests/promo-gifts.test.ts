import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProduct, productsIn } from "@/lib/catalog";
import { paymentItems, priceCheckout } from "@/lib/checkout";
import { orderRows } from "@/lib/orders";
import { quote, summarizeCart } from "@/lib/pricing";
import { giftFor, giftRules, giftsActive } from "@/lib/promo-gifts";
import { orderMessage } from "@/lib/whatsapp";

const DAY = "2026-11-20";
const customer = { name: "ישראל ישראלי", phone: "0521234567", email: "", city: "חיפה", address: "הרצל 1", notes: "" };

beforeEach(() => {
  giftRules.enabled = true;
});
afterEach(() => {
  giftRules.enabled = false;
});

describe("which shed gets which gift", () => {
  it("is on from the start to the last day inclusive, Israel dates", () => {
    expect(giftsActive("2026-11-03")).toBe(false);
    expect(giftsActive(giftRules.start)).toBe(true);
    expect(giftsActive("2026-12-03")).toBe(true);
    expect(giftsActive("2026-12-04")).toBe(false);
    giftRules.enabled = false;
    expect(giftsActive(DAY)).toBe(false);
  });

  it("gives the shelving unit below 6 m² and the parquet from 6 m² up (exactly 6 = parquet)", () => {
    const sizes = productsIn("modubox").map((p) => [p.slug, giftFor(p, DAY)?.size]);
    for (const [slug, size] of sizes) {
      const p = getProduct(slug as string)!;
      expect(size, slug as string).toBe(p.areaM2 >= 6 ? "large" : "small");
    }
    expect(giftFor(getProduct("modubox-3x2")!, DAY)?.addon).toBe("wpc-floor");
    expect(giftFor(getProduct("modubox-4x1-6")!, DAY)?.size).toBe("large");
    expect(giftFor(getProduct("modubox-3x1-6")!, DAY)?.addon).toBe("shelf-5");
  });

  it("puts exactly the threshold on the other side when the config says so", () => {
    const rules = { ...giftRules, atThreshold: "small" as const };
    expect(giftFor(getProduct("modubox-3x2")!, DAY, rules)?.size).toBe("small");
    expect(giftFor(getProduct("modubox-4x2")!, DAY, rules)?.size).toBe("large");
  });

  it("gives nothing for restroom units, the guard booth or Gilboa sheds", () => {
    for (const slug of ["toilet-1x1", "toilet-shower-3x1", "guard-booth-2x2", "gilboa-xl"]) {
      const p = getProduct(slug);
      if (p) expect(giftFor(p, DAY), slug).toBeNull();
    }
  });
});

describe("gifts in the price", () => {
  it("adds the shelving unit as a ₪0 line and keeps paid shelves charged", () => {
    const p = getProduct("modubox-2x2")!;
    const q = quote(p, { "shelf-5": 2 }, [], DAY);
    expect(q.gift?.line).toMatchObject({ label: "מתנה: כוננית אוורסט 5 מדפים", total: 0, gift: true });
    expect(q.total).toBe(p.price + 600);
  });

  it("asks for the parquet colour, then names it, at ₪0", () => {
    const p = getProduct("modubox-3x2")!;
    const none = quote(p, {}, [], DAY);
    expect(none.gift?.line.label).toBe("מתנה: רצפת פרקט WPC – בחרו צבע");
    expect(none.gift?.choice).toBeUndefined();
    const teak = quote(p, { "wpc-floor": "teak" }, [], DAY);
    expect(teak.gift?.choice).toBe("teak");
    expect(teak.gift?.line.label).toBe('מתנה: רצפת פרקט WPC – חום טיק (6 מ"ר)');
    expect(teak.lines.map((l) => l.id)).not.toContain("wpc-floor");
    expect(teak.total).toBe(7800);
  });

  it("charges the floor again once the promotion is over", () => {
    const p = getProduct("modubox-3x2")!;
    expect(quote(p, { "wpc-floor": "teak" }, [], "2026-12-04").total).toBe(7800 + 720);
  });

  it("reads in English on the English site", () => {
    const q = quote(getProduct("modubox-4x3", "en")!, { "wpc-floor": "grey" }, [], DAY);
    expect(q.gift?.line.label).toBe("Gift: WPC parquet floor – Antique oak (12 m²)");
    expect(quote(getProduct("modubox-2x2", "en")!, {}, [], DAY).gift?.line.label).toBe("Gift: Everest 5-shelf unit");
  });

  it("shows the gift in the WhatsApp order", () => {
    const cart = summarizeCart([{ id: "a", slug: "modubox-2x2", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }], "he", DAY);
    expect(orderMessage(cart)).toContain("🎁 מתנה: כוננית אוורסט 5 מדפים");
    expect(orderMessage(cart)).not.toContain("– מתנה");
  });
});

describe("the server's checkout agrees", () => {
  const body = {
    locale: "he",
    customer,
    installments: 1,
    items: [
      { slug: "modubox-4x3", qty: 1, selections: { "wpc-floor": "light" }, fulfillment: "deliveryAndInstallation" },
      { slug: "modubox-2x2", qty: 2, selections: {}, fulfillment: "deliveryAndInstallation" },
    ],
  };

  it("doesn't charge for a parquet floor the shed earns, and the client's cart matches", () => {
    const r = priceCheckout(body, { today: DAY });
    if (!r.ok) throw new Error(r.error);
    const p43 = getProduct("modubox-4x3")!;
    const p22 = getProduct("modubox-2x2")!;
    const delivery = (p43.fulfillment.deliveryAndInstallation ?? 0) + (p22.fulfillment.deliveryAndInstallation ?? 0) * 2;
    expect(r.order.total).toBe(p43.price + p22.price * 2 + delivery);
    const client = summarizeCart(body.items.map((x, i) => ({ id: String(i), ...x })) as never, "he", DAY);
    expect(client.total).toBe(r.order.total);
  });

  it("carries the gift and colour into Z-Credit, the DB order and its lines", () => {
    const r = priceCheckout(body, { today: DAY });
    if (!r.ok) throw new Error(r.error);
    const items = paymentItems(r.order);
    expect(items[0].Description.startsWith('מתנה: רצפת פרקט WPC – אלון מולבן (12 מ"ר)')).toBe(true);
    expect(items.find((x) => x.Name.includes("2×2") || x.Quantity === 2)?.Description).toContain("מתנה: כוננית אוורסט 5 מדפים");
    const rows = orderRows("261120000001", "s", r.order);
    expect(rows.items[0].addons).toContainEqual({ label: 'מתנה: רצפת פרקט WPC – אלון מולבן (12 מ"ר)', qty: 1, unitPrice: 0, total: 0, gift: true });
    expect(rows.items[1].addons).toContainEqual({ label: "מתנה: כוננית אוורסט 5 מדפים", qty: 1, unitPrice: 0, total: 0, gift: true });
  });

  it("charges the floor when the gifts are off", () => {
    giftRules.enabled = false;
    const r = priceCheckout(body, { today: DAY });
    if (!r.ok) throw new Error(r.error);
    const on = (giftRules.enabled = true, priceCheckout(body, { today: DAY }));
    if (!on.ok) throw new Error(on.error);
    expect(r.order.total - on.order.total).toBe(12 * 120);
  });
});
