import { describe, expect, it } from "vitest";
import {
  CONFIGURATOR_ORIGIN,
  designToCartItem,
  fallbackCartItem,
  parseDesign,
  productForModel,
  readMessage,
  sellableModels,
} from "../src/lib/configurator";
import { formatILS } from "../src/lib/format";
import { quote, summarizeCart } from "../src/lib/pricing";
import type { CartItem } from "../src/lib/types";
import { orderMessage } from "../src/lib/whatsapp";

// a 3×2 has 10 wall panels: front 0–2, right 3–4, back 5–7, left 8–9
const link = (q: string) => `${CONFIGURATOR_ORIGIN}/il?${q}`;

describe("parseDesign", () => {
  it("reads the configurator's defaults: 4×3, dark profiles, one door", () => {
    expect(parseDesign("")).toMatchObject({ model: "4x3", frame: "dark", doors: 1, windows: 0, vents: 0, floor: "standard" });
  });

  it("reads size, frame, panels, vents, floor and installation from a query or a whole link", () => {
    const d = parseDesign(link("m=3x2&f=l&p=.dw.e.s.G.&vt=3.9&fl=parquetGolden&in=1"));
    expect(d).toEqual({
      model: "3x2",
      frame: "light",
      doors: 1,
      doubleDoors: 0,
      windows: 1,
      glass: 1,
      shutters: 1,
      electric: 1,
      kipp: 0,
      glassDoors: 0,
      vents: 2,
      floor: "parquetGolden",
      installation: true,
    });
  });

  it("counts vented doors as doors and as vents, and the double door's two panels once", () => {
    const d = parseDesign("model=3x2&p=bcD.......");
    expect(d).toMatchObject({ doors: 1, doubleDoors: 1, vents: 1 });
  });

  it("falls back to one door when the panels don't fit the size", () => {
    expect(parseDesign("m=3x2&p=..d").doors).toBe(1);
    expect(parseDesign("m=3x2&p=..z.......").doors).toBe(1);
  });

  it("accepts sizes in centimetres and drops vents outside the walls", () => {
    expect(parseDesign("m=300x200").model).toBe("3x2");
    expect(parseDesign("m=3x2&vt=1.1.99").vents).toBe(1);
  });
});

describe("designToCartItem", () => {
  it("maps a design onto the product of its size and the builder's add-ons", () => {
    const item = designToCartItem(parseDesign("m=3x2&f=d&p=.dwwe.d...&vt=5&fl=parquetGrey"), link("m=3x2"))!;
    expect(item.product.slug).toBe("modubox-3x2");
    expect(item.selections).toMatchObject({
      "profile-color": "black",
      "extra-door": 1,
      "sliding-window": 2,
      "electric-panel": 1,
      "vent-grill": 1,
      "wpc-floor": "grey",
    });
    expect(item.design).toEqual({ source: "configurator", link: link("m=3x2"), exact: true });
    // 7,800 + door 1,190 + 2 windows 2,380 + panel 1,790 + grill 190 + WPC 6 m² × 120
    expect(quote(item.product, item.selections, item.design.extras).total).toBe(7800 + 1190 + 2380 + 1790 + 190 + 720);
  });

  it("prices a second glass wall as an extra line, and kipp windows on request", () => {
    const item = designToCartItem(parseDesign("m=3x2&p=sGG.k....."), "")!;
    expect(item.selections["glass-wall"]).toBe("glass-shutter");
    expect(item.design.extras).toEqual([
      { id: "glass-wall+glass", label: "קיר זכוכית ויטרינה: ויטרינה – זכוכית כפולה מבודדת", qty: 2, unitPrice: 1190 },
      { id: "cfg-kipp", label: "חלון קיפ", qty: 1, unitPrice: null },
    ]);
    const q = quote(item.product, item.selections, item.design.extras);
    expect(q.total).toBe(7800 + 1990 + 2 * 1190);
    expect(q.onRequest.map((l) => l.id)).toEqual(["cfg-kipp"]);
  });

  it("keeps the first door in the price, like the configurator", () => {
    const item = designToCartItem(parseDesign("m=2x2&p=.d......"), "")!;
    expect(item.selections["extra-door"]).toBeUndefined();
    expect(quote(item.product, item.selections).total).toBe(item.product.price);
  });

  it("returns null for a size the site doesn't sell", () => {
    expect(productForModel("9x9")).toBeUndefined();
    expect(designToCartItem({ ...parseDesign(""), model: "9x9" }, "")).toBeNull();
  });

  it("every configurator size in Israel has a product", () => {
    const models = sellableModels().map((m) => m.model);
    for (const m of ["1x1", "2x1", "2x2", "3x1", "3x2", "3x3", "4x1", "4x2", "4x3", "5x2", "5x3", "6x2", "6x3"]) expect(models).toContain(m);
  });
});

describe("fallbackCartItem", () => {
  it("adds the base product in the chosen size and colour, marked as not exact", () => {
    const item = fallbackCartItem("4x2", "dark", link("m=4x2&f=d"))!;
    expect(item.product.slug).toBe("modubox-4x2");
    expect(item.selections["profile-color"]).toBe("black");
    expect(item.design).toEqual({ source: "configurator", link: link("m=4x2&f=d"), exact: false });
  });
});

describe("readMessage", () => {
  const msg = { type: "modubox:design", design: { query: "m=3x2&p=.dw.......", link: link("m=3x2&p=.dw.......") } };

  it("reads a design from the configurator's origin", () => {
    const m = readMessage(CONFIGURATOR_ORIGIN, msg)!;
    expect(m.kind).toBe("design");
    expect(m.design).toMatchObject({ model: "3x2", windows: 1 });
    expect(m.link).toBe(msg.design.link);
  });

  it("reads add-to-cart, and builds the link from the query when none came", () => {
    const m = readMessage(CONFIGURATOR_ORIGIN, { type: "modubox:add-to-cart", design: { query: "m=2x2" } })!;
    expect(m.kind).toBe("add");
    expect(m.link).toBe(`${CONFIGURATOR_ORIGIN}/il?m=2x2`);
  });

  it("ignores other origins, other types, and links to other sites", () => {
    expect(readMessage("https://evil.example", msg)).toBeNull();
    expect(readMessage(CONFIGURATOR_ORIGIN, { ...msg, type: "other" })).toBeNull();
    expect(readMessage(CONFIGURATOR_ORIGIN, "modubox:design")).toBeNull();
    expect(readMessage(CONFIGURATOR_ORIGIN, { type: "modubox:design", design: { link: "https://evil.example/?m=3x2" } })).toBeNull();
    const m = readMessage(CONFIGURATOR_ORIGIN, { type: "modubox:design", design: { query: "m=3x2", link: "https://evil.example/" } })!;
    expect(m.link).toBe(`${CONFIGURATOR_ORIGIN}/il?m=3x2`);
  });
});

describe("a configurator item in the cart", () => {
  it("flows through the cart summary and the WhatsApp order", () => {
    const exact = designToCartItem(parseDesign("m=3x2&p=sG..k....."), link("m=3x2&p=sG..k....."))!;
    const rough = fallbackCartItem("2x2", "light", link("m=2x2&f=l"))!;
    const items: CartItem[] = [
      { id: "a", slug: exact.product.slug, qty: 1, selections: exact.selections, fulfillment: "deliveryAndInstallation", design: exact.design },
      { id: "b", slug: rough.product.slug, qty: 1, selections: rough.selections, fulfillment: "deliveryAndInstallation", design: rough.design },
    ];
    const cart = summarizeCart(items);
    expect(cart.itemsTotal).toBe(7800 + 1990 + 1190 + 5990);
    expect(cart.hasOnRequest).toBe(true);
    const text = orderMessage(cart);
    expect(text).toContain(`• קיר זכוכית ויטרינה: ויטרינה – זכוכית כפולה מבודדת – ${formatILS(1190)}`);
    expect(text).toContain("• חלון קיפ – מחיר בתיאום");
    expect(text).toContain(`🧊 עיצוב מהקונפיגורטור: ${link("m=3x2&p=sG..k.....")}`);
    expect(text).toContain("(הפתחים והתוספות מהעיצוב – לתיאום מול נציג)");
    expect(text.match(/לתיאום מול נציג/g)).toHaveLength(1);
  });
});
