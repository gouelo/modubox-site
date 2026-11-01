import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { he, type Vals } from "@/i18n/he";
import { lp, switchPath } from "@/i18n/config";
import { addonsFor, catalog } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { orderMessage, productMessage } from "@/lib/whatsapp";
import { summarizeCart } from "@/lib/pricing";

const HEBREW = /[֐-׿]/;
const vals: Vals = { factory: "F", days: 21, years: 10, payments: 12 };

/** Every leaf of a dictionary: its path, and its value (functions are called with sample arguments). */
function leaves(node: unknown, at = ""): [string, unknown][] {
  if (typeof node === "function") {
    const args = Array.from({ length: node.length }, (_, i) => (i === 0 ? vals : 2));
    // functions take strings, numbers or the Vals; try a few shapes until one returns a string
    for (const a of [args, ["x", "y", 3], [3, 4], ["x"]]) {
      try {
        const out = (node as (...a: unknown[]) => unknown)(...a);
        if (typeof out === "string") return [[at, out]];
      } catch {
        /* next shape */
      }
    }
    return [[at, ""]];
  }
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${at}[${i}]`));
  if (node && typeof node === "object") return Object.entries(node).flatMap(([k, v]) => leaves(v, at ? `${at}.${k}` : k));
  return [[at, node]];
}

/** The dictionary's shape: every key, array length and function arity. */
function shape(node: unknown, at = ""): string[] {
  if (typeof node === "function") return [`${at}()${node.length}`];
  if (Array.isArray(node)) return [`${at}[${node.length}]`, ...node.flatMap((v, i) => shape(v, `${at}[${i}]`))];
  if (node && typeof node === "object") return Object.entries(node).flatMap(([k, v]) => shape(v, at ? `${at}.${k}` : k));
  return [`${at}:${typeof node}`];
}

describe("dictionaries (src/i18n)", () => {
  it("English has every Hebrew key, with the same arrays and functions", () => {
    expect(shape(en).sort()).toEqual(shape(he).sort());
  });

  it("no string is left empty or untranslated", () => {
    // Hebrew on purpose: the switch to Hebrew on the English site ("עב", read out in Hebrew)
    const allowed = new Set(["lang.switchLabel", "lang.switchAria"]);
    const enLeaves = leaves(en);
    for (const [k, v] of enLeaves) {
      if (typeof v !== "string") continue;
      if (!allowed.has(k)) expect(v, k).not.toMatch(HEBREW);
    }
    // empty only where Hebrew is empty too
    const heMap = new Map(leaves(he));
    for (const [k, v] of enLeaves) if (v === "") expect(heMap.get(k), k).toBe("");
  });
});

describe("English content (data/en)", () => {
  const c = catalog("en");

  it("every product, add-on and choice has an English name", () => {
    for (const p of c.products) {
      expect(p.name, p.slug).not.toMatch(HEBREW);
      expect(p.shortDescription, p.slug).not.toMatch(HEBREW);
      if (p.badge) expect(p.badge, p.slug).not.toMatch(HEBREW);
      for (const n of [p.fulfillment.note, p.fulfillment.pickupNote, p.fulfillment.deliveryNote]) if (n) expect(n, p.slug).not.toMatch(HEBREW);
      for (const a of addonsFor(p)) {
        expect(a.name, a.id).not.toMatch(HEBREW);
        if (a.description) expect(a.description, a.id).not.toMatch(HEBREW);
        if (a.note) expect(a.note, a.id).not.toMatch(HEBREW);
        for (const ch of a.choices ?? []) expect(ch.label, `${a.id}/${ch.id}`).not.toMatch(HEBREW);
      }
    }
  });

  it("videos, photos, client names, reviews and the FAQ are in English", () => {
    for (const v of c.videos) expect(v.title, v.youtubeId).not.toMatch(HEBREW);
    for (const g of c.gallery) expect(g.alt, g.src).not.toMatch(HEBREW);
    for (const r of c.reviews) {
      expect(r.name).not.toMatch(HEBREW);
      expect(r.text).not.toMatch(HEBREW);
    }
    for (const g of c.faqGroups) {
      expect(g.title).not.toMatch(HEBREW);
      if (g.image) expect(g.image.alt).not.toMatch(HEBREW);
      for (const it of g.items) {
        expect(it.q).not.toMatch(HEBREW);
        expect(it.a, it.q).not.toMatch(HEBREW);
        if (it.link) expect(it.link.label).not.toMatch(HEBREW);
        if (Array.isArray(it.media)) for (const m of it.media) expect(m.alt, m.src).not.toMatch(HEBREW);
      }
    }
    for (const k of ["name", "tagline", "whatsappGreeting", "factory", "factory2", "pickupLocation"] as const) expect(c.site[k], k).not.toMatch(HEBREW);
  });

  it("the same Hebrew text has the same English text, and different texts differ", () => {
    const he = catalog("he");
    const pairs: [string, string][] = [
      ...he.products.map((p, i): [string, string] => [p.shortDescription, c.products[i].shortDescription]),
      ...he.products.map((p, i): [string, string] => [p.name, c.products[i].name]),
      ...he.addons.map((a, i): [string, string] => [a.description ?? "", c.addons[i].description ?? ""]),
    ];
    const byHe = new Map<string, string>();
    const byEn = new Map<string, string>();
    for (const [h, e] of pairs) {
      if (byHe.has(h)) expect(e, h).toBe(byHe.get(h));
      if (byEn.has(e)) expect(h, e).toBe(byEn.get(e));
      byHe.set(h, e);
      byEn.set(e, h);
    }
  });

  it("the FAQ has the same questions in both languages", () => {
    const heF = catalog("he").faqGroups;
    expect(c.faqGroups.map((g) => g.items.length)).toEqual(heF.map((g) => g.items.length));
  });

  it("the English text pages exist next to the Hebrew ones", () => {
    for (const page of ["terms", "warranty", "accessibility"]) {
      const enText = fs.readFileSync(path.join("content/en", `${page}.md`), "utf8");
      expect(fs.existsSync(path.join("content", `${page}.md`)), page).toBe(true);
      expect(enText, page).not.toMatch(HEBREW);
    }
  });
});

describe("English site behaviour", () => {
  it("prices stay in shekels", () => {
    expect(formatILS(1190, "en")).toBe("₪1,190");
    expect(formatILS(1190, "he")).toBe("1,190 ₪");
  });

  it("links and the language switch keep the page", () => {
    expect(lp("en", "/")).toBe("/en/");
    expect(lp("en", "/shop/")).toBe("/en/shop/");
    expect(lp("he", "/shop/")).toBe("/shop/");
    expect(switchPath("/product/modubox-3x2/", "en")).toBe("/en/product/modubox-3x2/");
    expect(switchPath("/en/product/modubox-3x2/", "he")).toBe("/product/modubox-3x2/");
    expect(switchPath("/en/", "he")).toBe("/");
    expect(switchPath("/", "en")).toBe("/en/");
  });

  it("WhatsApp messages from the English site are in English", () => {
    const p = catalog("en").products.find((x) => x.slug === "modubox-3x2")!;
    expect(productMessage(p)).not.toMatch(HEBREW);
    const cart = summarizeCart([{ id: "1", slug: "modubox-3x2", qty: 1, selections: {}, fulfillment: "delivery" }], "en");
    expect(cart.lines[0].product.name).not.toMatch(HEBREW);
    expect(orderMessage(cart, undefined, undefined, "en")).not.toMatch(HEBREW);
  });
});
