import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { catalogRows, changeState, copyProduct, discardProductDraft, draftCount, overridesOf, productsWith, publishDrafts, saveAddonDraft, saveProductDraft, triggerDeploy } from "@/lib/admin/catalog";
import { products } from "@/lib/catalog";
import { testDb } from "./db";

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

const base = products.find((p) => p.slug === "modubox-2x1")!;
const form = (over: Record<string, unknown> = {}) => ({
  name: "מחסן מודובוקס 2×1".replace(/[⁦-⁩]/g, ""),
  price: base.price,
  badge: base.badge,
  shortDescription: base.shortDescription,
  warrantyYears: base.warrantyYears,
  configurable: base.configurable,
  images: base.images,
  addons: [...base.addons].reverse(),
  addonPriceOverrides: {},
  fulfillment: { pickup: base.fulfillment.pickup, delivery: base.fulfillment.delivery, installation: base.fulfillment.installation, deliveryAndInstallation: base.fulfillment.deliveryAndInstallation, payToInstaller: false, note: base.fulfillment.note ?? null },
  en: { name: "", shortDescription: "", badge: "" },
  hidden: false,
  ...over,
});

describe("catalog drafts", () => {
  it("an unchanged form saves nothing; a change keeps only what changed", async () => {
    expect(await saveProductDraft(db, "modubox-2x1", form())).toEqual({ ok: true });
    expect((await catalogRows(db)).products).toHaveLength(0);
    await saveProductDraft(db, "modubox-2x1", form({ price: 4600, fulfillment: { ...form().fulfillment, deliveryAndInstallation: 750 } }));
    const rows = await catalogRows(db);
    expect(rows.products[0].draft).toEqual({ price: 4600, fulfillment: { deliveryAndInstallation: 750 } });
    expect(draftCount(rows)).toBe(1);
    expect(productsWith(overridesOf(rows, "draft")).find((p) => p.slug === "modubox-2x1")?.price).toBe(4600);
    // nothing published yet: the site still has the file price
    expect(productsWith(overridesOf(rows, "published")).find((p) => p.slug === "modubox-2x1")?.price).toBe(base.price);
  });

  it("refuses bad prices", async () => {
    expect(await saveProductDraft(db, "modubox-2x1", form({ price: 0 }))).toMatchObject({ ok: false });
    expect(await saveProductDraft(db, "modubox-2x1", form({ price: 12.5 }))).toMatchObject({ ok: false });
    expect(await saveProductDraft(db, "modubox-2x1", form({ fulfillment: { ...form().fulfillment, delivery: Number.NaN } }))).toMatchObject({ ok: false });
    expect(await saveProductDraft(db, "modubox-2x1", form({ images: [] }))).toMatchObject({ ok: false });
    expect(await saveProductDraft(db, "nope", form())).toMatchObject({ ok: false });
  });

  it("publish copies drafts; discard goes back to what is published", async () => {
    await saveProductDraft(db, "modubox-2x1", form({ price: 4600 }));
    await saveAddonDraft(db, "extra-door", { price: 1290 });
    expect(await publishDrafts(db)).toBe(2);
    expect(await publishDrafts(db)).toBe(0);
    let rows = await catalogRows(db);
    expect(overridesOf(rows, "published")).toEqual({ products: { "modubox-2x1": { price: 4600 } }, addons: { "extra-door": { price: 1290 } } });
    // published, the build not run yet: "publishing"; once built in: nothing to show
    expect(changeState(rows.products[0].draft, rows.products[0].published, undefined)).toBe("publishing");
    expect(changeState(rows.products[0].draft, rows.products[0].published, { price: 4600 })).toBeNull();
    await saveProductDraft(db, "modubox-2x1", form({ price: 4700 }));
    await discardProductDraft(db, "modubox-2x1");
    rows = await catalogRows(db);
    expect(rows.products[0].draft).toEqual({ price: 4600 });
    expect(draftCount(rows)).toBe(0);
  });

  it("a copy is a new product after its original, unique address", async () => {
    expect(await copyProduct(db, "modubox-3x3", "modubox-3x3", "x")).toMatchObject({ ok: false });
    expect(await copyProduct(db, "modubox-3x3", "Bad Slug", "x")).toMatchObject({ ok: false });
    expect(await copyProduct(db, "modubox-3x3", "modubox-7x3", "מחסן 7×3")).toEqual({ ok: true });
    const list = productsWith(overridesOf(await catalogRows(db), "draft"));
    const i = list.findIndex((p) => p.slug === "modubox-3x3");
    expect(list[i + 1]).toMatchObject({ slug: "modubox-7x3", name: "מחסן 7×3", copiedFrom: "modubox-3x3" });
  });

  it("add-on drafts keep only changes", async () => {
    await saveAddonDraft(db, "glass-wall", { name: "קיר זכוכית ויטרינה", choices: { glass: { label: "ויטרינה – זכוכית כפולה מבודדת", price: 1290 }, none: { label: "ללא", price: 0 } } });
    expect((await catalogRows(db)).addons[0].draft).toEqual({ choices: { glass: { price: 1290 } } });
    expect(await saveAddonDraft(db, "glass-wall", { price: -1 })).toMatchObject({ ok: false });
  });

  it("publishing without a deploy hook says so", async () => {
    expect(await triggerDeploy({})).toBe("no_hook");
    expect(await triggerDeploy({ VERCEL_DEPLOY_HOOK_URL: "https://evil.example/x" })).toBe("no_hook");
  });
});
