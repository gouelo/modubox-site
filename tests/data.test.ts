// Checks the data files, so a typo in products.json is caught before the site goes up.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import clientsFile from "../data/clients.json";
import promo from "../data/promo.json";
import { addons, allCategories, categories, gallery, products } from "../src/lib/catalog";

describe("data files", () => {
  it("every product has a unique slug made of safe characters", () => {
    const slugs = products.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it("every product has a price and at least one photo that exists", () => {
    for (const p of products) {
      expect(p.price, p.slug).toBeGreaterThan(0);
      expect(p.images.length, p.slug).toBeGreaterThan(0);
      for (const img of p.images) expect(fs.existsSync(`public/images/${img}`), `${p.slug}: ${img}`).toBe(true);
    }
  });

  it("every add-on a product lists exists", () => {
    const ids = new Set(addons.map((a) => a.id));
    for (const p of products) for (const a of p.addons) expect(ids.has(a), `${p.slug}: ${a}`).toBe(true);
  });

  it("add-on and gallery images exist", () => {
    for (const a of addons) if (a.image) expect(fs.existsSync(`public/images/${a.image}`), a.id).toBe(true);
    for (const g of gallery) expect(fs.existsSync(`public/images/${g.src}`), g.src).toBe(true);
  });

  it("the monthly promo has a title, a valid end date and a button", () => {
    expect(promo.title.length).toBeGreaterThan(0);
    if (promo.endDate) expect(promo.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(promo.cta.label.length).toBeGreaterThan(0);
    expect(promo.cta.href === "whatsapp" || promo.cta.href.startsWith("/")).toBe(true);
  });

  it("client logos exist", () => {
    for (const c of clientsFile.clients) expect(fs.existsSync(`public/${c.file}`), c.file).toBe(true);
  });

  it("hidden categories keep their products but leave the catalog", () => {
    expect(categories.map((c) => c.id)).not.toContain("gilboa");
    expect(allCategories.map((c) => c.id)).toContain("gilboa");
    expect(products.some((p) => p.category === "gilboa")).toBe(true);
  });
});
