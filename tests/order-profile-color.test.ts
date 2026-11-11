import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "../src/db";
import { orderItems } from "../src/db/schema";
import { cleanSelections, paymentItems, priceCheckout, type PricedOrder } from "../src/lib/checkout";
import { getProduct } from "../src/lib/catalog";
import { getOrder, recordPayment, saveNewOrder } from "../src/lib/orders";
import { customerOrderEmail, orderEmail } from "../src/lib/notify";
import { orderMessage } from "../src/lib/whatsapp";
import { listOrders, orderProfiles, readFilters } from "../src/lib/admin/queries";
import { ordersCsv } from "../src/lib/admin/csv";
import { priceManualOrder } from "../src/lib/admin/manual-order";
import { itemProfile, orderProfileTag } from "../src/lib/profile-color";
import { testDb } from "./db";

const customer = { name: "רון בדיקה", phone: "052-1234567", email: "a@b.co", city: "חיפה", address: "הרצל 1" };
const shed = (selections: Record<string, unknown>, slug = "modubox-2x2") => ({ slug, qty: 1, selections, fulfillment: "deliveryAndInstallation" });

function priced(items: unknown[]): PricedOrder {
  const r = priceCheckout({ locale: "he", items, customer, installments: 1 });
  if (!r.ok) throw new Error(r.error);
  return r.order;
}

const paid = async (db: Db, id: string, order: PricedOrder) => {
  await saveNewOrder(db, id, "s", order);
  await recordPayment(db, { orderId: id, total: order.total, sessionId: "s", data: { ReferenceNumber: "R" } });
  return (await getOrder(db, id))!;
};

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

describe("profile colour on every order (round 21)", () => {
  it("keeps only a colour the customer picked: no default at checkout", () => {
    const p = getProduct("modubox-2x2")!;
    expect(cleanSelections(p, { "profile-color": "black" })["profile-color"]).toBe("black");
    expect(cleanSelections(p, { "profile-color": "white" })["profile-color"]).toBe("white");
    expect(cleanSelections(p, {})["profile-color"]).toBeUndefined();
    expect(cleanSelections(p, { "profile-color": "red" })["profile-color"]).toBeUndefined();
    // one colour per shed, never a count
    expect(cleanSelections(p, { "profile-color+black": 2 })).not.toHaveProperty("profile-color+black");
  });

  it("is saved on each order line, white too", async () => {
    await saveNewOrder(db, "261111000001", "s", priced([shed({ "profile-color": "white" }), shed({ "profile-color": "black" }, "modubox-3x2"), shed({}, "gilboa-m")]));
    const rows = await db.select().from(orderItems).where(eq(orderItems.orderId, "261111000001")).orderBy(orderItems.position);
    expect(rows.map((r) => r.profileColor)).toEqual(["white", "black", null]);
  });

  it("reaches Z-Credit first in the description, and once", () => {
    const [white, black] = paymentItems(priced([shed({ "profile-color": "white", "sliding-window": 1 }), shed({ "profile-color": "black" }, "modubox-3x2")])).filter((x) => x.Amount > 1000);
    expect(white.Description).toMatch(/^צבע פרופיל: לבן, /);
    expect(black.Description.startsWith("צבע פרופיל: שחור")).toBe(true);
    expect(black.Description).not.toContain("צבע פרופילי אלומיניום");
  });

  it("is in the cart's WhatsApp message", () => {
    const msg = orderMessage(priced([shed({ "profile-color": "black" })]).cart);
    expect(msg).toContain("צבע פרופיל: שחור");
    expect(msg).not.toContain("צבע פרופילי אלומיניום");
  });

  it("is in the business email and the customer's, under the item", async () => {
    const full = await paid(db, "261111000002", priced([shed({ "profile-color": "white" })]));
    for (const m of [orderEmail(full, "https://x.test/admin/"), customerOrderEmail(full, "https://x.test")]) {
      expect(m.text).toContain("צבע פרופיל: לבן");
      expect(m.html).toContain("צבע פרופיל: לבן");
    }
    // right under the item's name, before its add-ons
    const lines = orderEmail(full, "https://x.test/admin/").text.split("\n");
    const at = lines.findIndex((l) => l.startsWith("מחסן מודובוקס 2×2"));
    expect(lines[at + 1]).toBe("  • צבע פרופיל: לבן");
  });

  it("an older order: black from its add-on line (shown once), otherwise 'לא צוין'", async () => {
    const full = await paid(db, "261111000003", priced([shed({ "profile-color": "black" }), shed({ "profile-color": "white" }, "modubox-3x2")]));
    // as saved before round 21: no column, black kept only as its add-on line
    await db.update(orderItems).set({ profileColor: null }).where(eq(orderItems.orderId, "261111000003"));
    const old = (await getOrder(db, "261111000003"))!;
    expect(old.items[0].addons.map((a) => a.label)).toContain("צבע פרופילי אלומיניום: שחור");
    const [black, unknown] = old.items.map(itemProfile);
    expect(black).toMatchObject({ show: true, color: "black", line: "צבע פרופיל: שחור" });
    expect(black.addons.map((a) => a.label)).not.toContain("צבע פרופילי אלומיניום: שחור");
    expect(unknown).toMatchObject({ show: true, color: null, line: "צבע פרופיל: לא צוין" });
    const m = orderEmail(old, "https://x.test/admin/").text;
    expect(m).toContain("צבע פרופיל: שחור");
    expect(m).toContain("צבע פרופיל: לא צוין");
    expect(m).not.toContain("צבע פרופילי אלומיניום");
    expect(full.items[1].profileColor).toBe("white");
  });

  it("a product with no colour choice gets no line", () => {
    expect(itemProfile({ productSlug: "gilboa-m", profileColor: null, addons: [] }).show).toBe(false);
    expect(orderProfileTag([{ productSlug: "gilboa-m", profileColor: null, addons: [] }])).toBeNull();
  });

  it("the orders list: one word per order, 'מעורב' when its sheds differ", async () => {
    await paid(db, "261111000004", priced([shed({ "profile-color": "black" })]));
    await paid(db, "261111000005", priced([shed({ "profile-color": "black" }), shed({ "profile-color": "white" }, "modubox-3x2")]));
    await paid(db, "261111000006", priced([shed({ "profile-color": "white" }), shed({ "profile-color": "white" }, "modubox-3x2")]));
    const { rows } = await listOrders(db, readFilters({}));
    const tags = await orderProfiles(db, rows.map((o) => o.id));
    expect(Object.fromEntries(tags)).toEqual({ "261111000004": "שחור", "261111000005": "מעורב", "261111000006": "לבן" });
  });

  it("has its own column in the CSV export", async () => {
    const full = await paid(db, "261111000007", priced([shed({ "profile-color": "black" })]));
    const [head, row] = ordersCsv([full]).split("\r\n");
    expect(head).toContain("צבע פרופיל");
    expect(row).toContain("שחור");
    expect(row).not.toContain("צבע פרופילי אלומיניום");
  });

  it("a phone order needs a colour for each shed", () => {
    const input = (selections: Record<string, unknown>) => ({ items: [shed(selections)], customer: { name: "רונית", phone: "054-7654321" }, source: "phone" as const, payment: "transfer" as const, paid: false });
    expect(priceManualOrder(input({}), new Map())).toEqual({ ok: false, error: "בחרו צבע פרופיל (לבן או שחור) לכל מחסן." });
    expect(priceManualOrder(input({ "profile-color": "black" }), new Map()).ok).toBe(true);
  });
});
