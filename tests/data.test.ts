// Checks the data files, so a typo in products.json is caught before the site goes up.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { addons, gallery, products } from "../src/lib/catalog";

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
});
