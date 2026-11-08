import fs from "node:fs";
import { describe, expect, it } from "vitest";
import vercel from "../vercel.json";
import sitemap from "../src/app/sitemap";
import { dict } from "@/i18n";
import { DESCRIPTION_LENGTH, fitDescription } from "@/i18n/meta";
import { products } from "@/lib/catalog";
import { accessoryAddons, categoryPages, categoryProducts, categorySlugs, everestModels } from "@/lib/category-pages";
import { productJsonLd, productMeta } from "@/views/ProductPage";
import { categoryMeta } from "@/views/CategoryPage";

// The agency's SEO migration report (2026-11-08): the old category addresses keep a page of their own.
const SLUGS = ["everest", "insulated-panel-sheds", "easy-construction-sheds", "garden-sheds", "outdoor-sheds", "מבנים-מיוחדים-ושירותים", "gilboa", "shed-accessories"];
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

describe("category pages", () => {
  it("one for each old category address", () => {
    expect([...categorySlugs].sort()).toEqual([...SLUGS].sort());
  });

  for (const locale of ["he", "en"] as const) {
    it(`${locale}: title and description in length, the H1 in the title, copy and questions`, () => {
      for (const p of categoryPages(locale)) {
        expect(p.description.length, p.slug).toBeGreaterThanOrEqual(DESCRIPTION_LENGTH.min);
        expect(p.description.length, p.slug).toBeLessThanOrEqual(DESCRIPTION_LENGTH.max);
        expect(p.title.length, p.slug).toBeLessThanOrEqual(60);
        if (locale === "en") expect(`${p.title}${p.h1}${p.lead}${p.description}`, p.slug).not.toMatch(/[֐-׿]/);
        if (p.slug === "gilboa") continue; // minimal on purpose: the products are hidden from the catalog
        // the phrase the old address ranked for leads the title and is in the H1
        expect(p.h1.toLowerCase(), p.slug).toContain(p.title.split(" – ")[0].toLowerCase());
        // 200–400 words of copy (the add-ons' own texts on the accessories page); English takes more words for the same text
        const addons = p.products === "addons" ? accessoryAddons(locale).map((a) => `${a.name} ${a.description ?? ""}`) : [];
        const copy = words([p.lead, ...p.sections.flatMap((s) => s.text), ...p.faq.flatMap((f) => [f.q, f.a]), ...addons].join(" "));
        expect(copy, p.slug).toBeGreaterThanOrEqual(200);
        expect(copy, p.slug).toBeLessThanOrEqual(locale === "he" ? 400 : 450);
        expect(p.faq.length, p.slug).toBeGreaterThanOrEqual(3);
        if (p.products !== "addons") expect(categoryProducts(p, locale).length, p.slug).toBeGreaterThan(0);
      }
    });
  }

  it("/everest/ says plainly an Everest shed is a Modubox shed, and the main FAQ asks it", () => {
    const he = categoryPages("he").find((p) => p.slug === "everest")!;
    expect(`${he.lead} ${he.sections.flatMap((s) => s.text).join(" ")}`).toMatch(/אוורבוקס/);
    expect(he.products).toBe("modubox");
    const faq = JSON.parse(fs.readFileSync("data/faq.json", "utf8"));
    expect(JSON.stringify(faq)).toContain("מה ההבדל בין מחסן מודובוקס למחסן אוורסט?");
    expect(JSON.stringify(JSON.parse(fs.readFileSync("data/en/faq.json", "utf8")))).toMatch(/Everest/);
  });

  it("in the sitemap, in both languages; the footer row is the only link to them", async () => {
    const urls = (await sitemap()).map((e) => decodeURI(e.url));
    for (const slug of SLUGS) {
      expect(urls.some((u) => u.endsWith(`/${slug}/`) && !u.includes("/en/")), slug).toBe(true);
      expect(urls.some((u) => u.endsWith(`/en/${slug}/`)), slug).toBe(true);
    }
    for (const p of products) expect(urls.some((u) => u.endsWith(`/product/${p.slug}/`)), p.slug).toBe(true);
    const linking = ["src/components/Header.tsx", "src/views/HomePage.tsx", "src/views/ShopPage.tsx", "src/views/ProductPage.tsx"].filter((f) => fs.existsSync(f));
    for (const f of linking) expect(fs.readFileSync(f, "utf8"), f).not.toMatch(/categoryPages|categoryPath/);
    expect(fs.readFileSync("src/components/Footer.tsx", "utf8")).toMatch(/categoryPages/);
  });

  it("meta: the page's own title and description", () => {
    const m = categoryMeta("he", encodeURIComponent("מבנים-מיוחדים-ושירותים"));
    expect(m.title).toBe(categoryPages("he").find((p) => p.slug === "מבנים-מיוחדים-ושירותים")!.title);
  });
});

describe("product pages", () => {
  it("Everest in the old Everest models' titles, descriptions in length", () => {
    for (const locale of ["he", "en"] as const) {
      for (const p of products) {
        const m = productMeta(locale, p.slug);
        const d = String(m.description);
        expect(d.length, `${locale} ${p.slug}: ${d}`).toBeLessThanOrEqual(DESCRIPTION_LENGTH.max);
        expect(d.length, `${locale} ${p.slug}: ${d}`).toBeGreaterThanOrEqual(DESCRIPTION_LENGTH.min);
        const title = JSON.stringify(m.title);
        if (everestModels.has(p.slug)) expect(title, p.slug).toMatch(locale === "he" ? /אוורסט/ : /Everest/);
      }
    }
  });

  it("Product JSON-LD: sku, shipping and returns, no rating of its own", () => {
    const p = products.find((x) => x.slug === "modubox-3x3")!;
    type Offers = { offers: Record<string, Record<string, unknown> & { shippingRate?: { value: number } }> & { priceValidUntil?: string } };
    const j = productJsonLd(p, "he", 900, 21, null) as unknown as Offers & Record<string, unknown>;
    expect(j.sku).toBe("modubox-3x3");
    expect(j).not.toHaveProperty("aggregateRating");
    expect(j.offers.shippingDetails.shippingRate?.value).toBe(900);
    expect(j.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(14);
    expect(j.offers.priceValidUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(j.offers.seller["@id"]).toMatch(/#business$/);
    expect((productJsonLd(p, "he", null, 21, null) as unknown as Offers).offers).not.toHaveProperty("shippingDetails");
  });
});

describe("staging and descriptions", () => {
  it("vercel.app answers noindex", () => {
    const rule = vercel.headers[0];
    expect(rule.has[0]).toMatchObject({ type: "host" });
    expect(new RegExp(`^${rule.has[0].value}$`).test("modubox-site.vercel.app")).toBe(true);
    expect(new RegExp(`^${rule.has[0].value}$`).test("www.modubox.com")).toBe(false);
    expect(rule.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
  });

  it("fitDescription: the first that fits, else cut on a word", () => {
    const long = "מילה ".repeat(60);
    expect(fitDescription(["קצר", "א".repeat(130)])).toBe("א".repeat(130));
    expect(fitDescription([long]).length).toBeLessThanOrEqual(DESCRIPTION_LENGTH.max);
  });

  it("every fixed page's description is 120–155 characters", () => {
    for (const locale of ["he", "en"] as const) {
      const meta = dict(locale).meta as unknown as Record<string, { description?: string }>;
      for (const [k, v] of Object.entries(meta)) {
        if (!v || typeof v !== "object" || typeof v.description !== "string") continue;
        expect(v.description.length, `${locale} ${k}`).toBeGreaterThanOrEqual(DESCRIPTION_LENGTH.min);
        expect(v.description.length, `${locale} ${k}`).toBeLessThanOrEqual(DESCRIPTION_LENGTH.max);
      }
    }
  });
});
