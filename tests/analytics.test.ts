import { describe, expect, it } from "vitest";
import { ecommerce, GTM_ID, gtmId, linkEvent } from "@/lib/analytics";
import { getProduct } from "@/lib/catalog";
import { summarizeCart } from "@/lib/pricing";
import { signReceipt, verifyReceipt, signOrder } from "@/lib/zcredit";

describe("gtmId", () => {
  it("loads only on Vercel production", () => {
    expect(gtmId({ VERCEL_ENV: "production" })).toBe(GTM_ID);
    expect(gtmId({ VERCEL_ENV: "preview" })).toBe("");
    expect(gtmId({ GITHUB_PAGES: "true" })).toBe("");
    expect(gtmId({})).toBe("");
  });
  it("NEXT_PUBLIC_GTM_ID overrides, or turns it off", () => {
    expect(gtmId({ VERCEL_ENV: "preview", NEXT_PUBLIC_GTM_ID: "GTM-TEST1" })).toBe("GTM-TEST1");
    expect(gtmId({ VERCEL_ENV: "production", NEXT_PUBLIC_GTM_ID: "off" })).toBe("");
  });
});

describe("linkEvent", () => {
  it("WhatsApp links, without the message text", () => {
    expect(linkEvent("https://wa.me/972529555057?text=%D7%A9%D7%9D%3A%20%D7%99%D7%95%D7%90%D7%9C")).toEqual({ event: "whatsapp_click", link_url: "https://wa.me/972529555057" });
    expect(linkEvent("https://api.whatsapp.com/send?phone=972529555057")?.event).toBe("whatsapp_click");
  });
  it("phone links", () => {
    expect(linkEvent("tel:052-955-5057")).toEqual({ event: "phone_click", link_url: "tel:0529555057" });
  });
  it("other links are not counted", () => {
    expect(linkEvent("https://www.modubox.com/shop/")).toBeNull();
    expect(linkEvent("mailto:a@b.c")).toBeNull();
  });
});

describe("ecommerce", () => {
  it("GA4 items, ILS, and no customer details", () => {
    const slug = "modubox-2x0-8";
    expect(getProduct(slug)).toBeDefined();
    const cart = summarizeCart([{ id: "a", slug, qty: 2, selections: {}, fulfillment: "deliveryAndInstallation" }]);
    expect(cart.lines).toHaveLength(1);
    const e = ecommerce(cart);
    expect(e.currency).toBe("ILS");
    expect(e.value).toBe(cart.total);
    expect(e.items[0]).toMatchObject({ item_id: slug, quantity: 2, price: cart.lines[0].quote.total });
    expect(Object.keys(e.items[0]).sort()).toEqual(["item_category", "item_id", "item_name", "price", "quantity"]);
  });
});

describe("receipt", () => {
  it("is signed for its order, total and session, apart from the callback", () => {
    const sig = signReceipt("k", "1", 100, "s");
    expect(verifyReceipt("k", "1", 100, "s", sig)).toBe(true);
    expect(verifyReceipt("k", "1", 101, "s", sig)).toBe(false);
    expect(verifyReceipt("k", "1", 100, "t", sig)).toBe(false);
    expect(sig).not.toBe(signOrder("k", "1", 100));
  });
});
