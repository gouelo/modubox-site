import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProduct, plain } from "../src/lib/catalog";
import { defaultSelections, quote, summarizeCart } from "../src/lib/pricing";
import { giftRules } from "../src/lib/promo-gifts";
import type { CartItem, FulfillmentId } from "../src/lib/types";
import { configMessage, orderMessage } from "../src/lib/whatsapp";

const DAY = "2026-11-20"; // the November gift is on

beforeEach(() => {
  giftRules.enabled = true;
});
afterEach(() => {
  giftRules.enabled = false;
});

const item = (slug: string, fulfillment: FulfillmentId, selections = {}): CartItem => ({ id: slug, slug, qty: 1, selections, fulfillment });

describe("builder WhatsApp message: delivery & installation (round 20)", () => {
  it("lists the size's delivery & installation price and a total that includes it", () => {
    const p = getProduct("modubox-3x2")!;
    const q = quote(p, { ...defaultSelections(p), "electric-panel": 1, "wpc-floor": "teak" }, [], DAY);
    const msg = plain(configMessage(p, q));
    expect(msg).toBe(
      [
        "היי מודובוקס! אשמח להזמין מחסן מודובוקס 3×2",
        "",
        "מחיר בסיס: 7,800 ₪",
        "",
        "התוספות שבחרתי:",
        "• פאנל חשמל למחסן – 1,790 ₪",
        '🎁 מתנה: רצפת פרקט WPC – חום טיק (6 מ"ר)',
        "",
        "הובלה והתקנה: 1,000 ₪",
        'סה"כ כולל הובלה והתקנה: 10,590 ₪',
      ].join("\n"),
    );
  });

  it("never says the price depends on the area", () => {
    for (const slug of ["modubox-1x0-8", "modubox-3x2", "guard-booth-2x2", "toilet-1x1", "gilboa-m"]) {
      for (const locale of ["he", "en"] as const) {
        const p = getProduct(slug, locale)!;
        const msg = configMessage(p, quote(p, defaultSelections(p), [], DAY));
        expect(msg, slug).not.toMatch(/לפי האזור|by area/);
        const cart = orderMessage(summarizeCart([item(slug, "deliveryAndInstallation")], locale, DAY), undefined, undefined, locale);
        expect(cart, slug).not.toMatch(/לפי האזור|by area/);
      }
    }
  });

  it("a small size gets its own price", () => {
    const p = getProduct("modubox-1x0-8")!;
    const msg = plain(configMessage(p, quote(p, defaultSelections(p), [], DAY)));
    expect(msg).toContain("הובלה והתקנה: 500");
    expect(msg).toContain('סה"כ כולל הובלה והתקנה: 3,090');
  });

  it("the guard booth's delivery is included in its price", () => {
    const p = getProduct("guard-booth-2x2")!;
    const msg = plain(configMessage(p, quote(p, defaultSelections(p), [], DAY)));
    expect(msg).toContain("הובלה והתקנה: כלול במחיר");
    expect(msg).toContain('סה"כ כולל הובלה והתקנה: 12,250');
  });

  it("delivery on request leaves the total without it, and says so", () => {
    const base = getProduct("modubox-3x2")!;
    const p = { ...base, fulfillment: { ...base.fulfillment, deliveryAndInstallation: null } };
    const msg = plain(configMessage(p, quote(p, defaultSelections(p), [], DAY)));
    expect(msg).toContain("הובלה והתקנה: בתיאום");
    expect(msg).toContain('סה"כ (לא כולל הובלה והתקנה): 7,800');
  });

  it("reads in English", () => {
    const p = getProduct("modubox-3x2", "en")!;
    const msg = plain(configMessage(p, quote(p, { ...defaultSelections(p), "electric-panel": 1, "wpc-floor": "teak" }, [], DAY)));
    expect(msg).toContain("Delivery & installation: ₪1,000");
    expect(msg).toContain("Total incl. delivery & installation: ₪10,590");
    expect(msg).toMatch(/🎁 Gift: /);
    expect(msg).not.toMatch(/– Free/);
  });
});

describe("cart WhatsApp message: how it arrives, said honestly", () => {
  it("delivery & installation: its line, a subtotal and a total that includes it", () => {
    const msg = plain(orderMessage(summarizeCart([item("modubox-3x2", "deliveryAndInstallation", { "electric-panel": 1 })], "he", DAY)));
    expect(msg).toContain("🚚 הובלה והתקנה: 1,000");
    expect(msg).toContain("מוצרים ותוספות: 9,590");
    expect(msg).toContain('סה"כ לתשלום כולל הובלה והתקנה: 10,590');
  });

  it("self pickup: no delivery, and the total doesn't claim it", () => {
    const msg = plain(orderMessage(summarizeCart([item("gilboa-m", "pickup")], "he", DAY)));
    expect(msg).toContain("📦 איסוף עצמי, ללא הובלה והתקנה");
    expect(msg).not.toContain("כולל הובלה והתקנה");
    expect(msg).toContain('סה"כ לתשלום: 3,290');
  });

  it("delivery only: says there is no installation", () => {
    const msg = plain(orderMessage(summarizeCart([item("gilboa-m", "delivery")], "he", DAY)));
    expect(msg).toContain("🚚 הובלה בלבד, ללא התקנה: 300");
    expect(msg).toContain("הובלה: 300");
    expect(msg).toContain('סה"כ לתשלום: 3,590');
  });

  it("paid to the installer: shown, and kept out of the online total", () => {
    const msg = plain(orderMessage(summarizeCart([item("toilet-1x1", "deliveryAndInstallation")], "he", DAY)));
    expect(msg).toContain("🚚 הובלה והתקנה: 800 ₪ (תשלום למתקין)");
    expect(msg).toContain('סה"כ לתשלום: 4,300');
    expect(msg).toContain("לתשלום למתקין ביום ההתקנה: 800");
  });

  it("the guard booth: included", () => {
    const msg = plain(orderMessage(summarizeCart([item("guard-booth-2x2", "deliveryAndInstallation")], "he", DAY)));
    expect(msg).toContain("🚚 הובלה והתקנה: כלול במחיר");
    expect(msg).toContain('סה"כ לתשלום כולל הובלה והתקנה: 12,250');
  });

  it("reads in English", () => {
    const msg = plain(orderMessage(summarizeCart([item("gilboa-m", "pickup")], "en", DAY), undefined, undefined, "en"));
    expect(msg).toContain("📦 Self pickup, no delivery or installation");
  });
});
