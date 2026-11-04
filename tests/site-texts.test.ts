import { describe, expect, it } from "vitest";
import { catalog } from "../src/lib/catalog";
import { applyFaqPatch, applyReviewsPatch, applySitePatch, type FaqPatch } from "../src/lib/catalog-overrides";
import { cleanFaqRows, cleanReviews, faqForm, fileReviews, fileSiteTexts, pendingTexts, promoError, saveText, savedTexts, siteDiff, siteError, filePromo } from "../src/lib/admin/site-texts";
import { testDb } from "./db";

const untouched = (): FaqPatch => ({ groups: Object.fromEntries(faqForm(undefined).map((g) => [g.id, { items: g.rows }])) });

describe("the site's texts, as the admin saves them", () => {
  it("leave the site exactly as it is when nothing was changed", () => {
    for (const locale of ["he", "en"] as const) {
      const c = catalog(locale);
      expect(applyFaqPatch(c.faqGroups, untouched(), locale)).toEqual(c.faqGroups);
      expect(applyReviewsPatch(c.reviews, { reviews: fileReviews() }, locale)).toEqual(c.reviews);
      expect(applySitePatch(c.site, siteDiff(fileSiteTexts()), locale)).toEqual(c.site);
    }
    expect(siteDiff(fileSiteTexts())).toEqual({});
    // what the editors send back for an untouched list compares equal to the files
    for (const g of faqForm(undefined)) expect(cleanFaqRows(JSON.parse(JSON.stringify(g.rows)), g.rows.length)).toEqual(g.rows);
    expect(cleanReviews(JSON.parse(JSON.stringify(fileReviews())))).toEqual(fileReviews());
  });

  it("reorder, hide, edit and add FAQ questions, keeping photos, links and English", () => {
    const he = catalog("he").faqGroups;
    const en = catalog("en").faqGroups;
    const g = faqForm(undefined)[0];
    const rows = [{ ...g.rows[1], q: "שאלה ערוכה?" }, { ...g.rows[0], hidden: true }, ...g.rows.slice(2), { q: "שאלה חדשה?", a: "תשובה חדשה.", en: { q: "", a: "" } }];
    const patch: FaqPatch = { groups: { [g.id]: { items: rows, title: "כותרת חדשה" } } };
    const outHe = applyFaqPatch(he, patch, "he")[0];
    expect(outHe.title).toBe("כותרת חדשה");
    expect(outHe.items[0]).toEqual({ ...he[0].items[1], q: "שאלה ערוכה?" });
    expect(outHe.items).toHaveLength(he[0].items.length);
    expect(outHe.items.at(-1)).toEqual({ q: "שאלה חדשה?", a: "תשובה חדשה." });
    const outEn = applyFaqPatch(en, patch, "en")[0];
    expect(outEn.title).toBe(en[0].title);
    expect(outEn.items[0]).toEqual(en[0].items[1]);
    expect(outEn.items.at(-1)).toEqual({ q: "שאלה חדשה?", a: "תשובה חדשה." });
    expect(applyFaqPatch(he, patch, "he").slice(1)).toEqual(he.slice(1));
  });

  it("reviews: order and hiding; a new one without English stays off the English site", () => {
    const rows = [{ name: "חדש", date: "2026-11-01", rating: 5, text: "מעולה", en: { name: "", text: "" } }, ...fileReviews().slice(1), { ...fileReviews()[0], hidden: true }];
    const he = applyReviewsPatch(catalog("he").reviews, { reviews: rows }, "he");
    expect(he[0]).toEqual({ name: "חדש", date: "2026-11-01", rating: 5, text: "מעולה" });
    expect(he).toHaveLength(fileReviews().length);
    const en = applyReviewsPatch(catalog("en").reviews, { reviews: rows }, "en");
    expect(en).toEqual(catalog("en").reviews.slice(1));
    expect(cleanReviews([{ name: "x", date: "bad", rating: 5, text: "y" }])).toBeNull();
  });

  it("business details: numbers in both languages, words per language", () => {
    const patch = siteDiff({ ...fileSiteTexts(), phone: "03-1234567", rating: 4.8, floatingConfiguratorCta: false, factory: "מפעל חדש", en: { ...fileSiteTexts().en, factory: "New factory" } });
    expect(patch).toEqual({ phone: "03-1234567", rating: 4.8, floatingConfiguratorCta: false, factory: "מפעל חדש", en: { factory: "New factory" } });
    const he = applySitePatch(catalog("he").site, patch, "he");
    const en = applySitePatch(catalog("en").site, patch, "en");
    expect([he.phone, he.rating, he.floatingConfiguratorCta, he.factory]).toEqual(["03-1234567", 4.8, false, "מפעל חדש"]);
    expect([en.phone, en.rating, en.factory]).toEqual(["03-1234567", 4.8, "New factory"]);
    expect(siteError({ ...fileSiteTexts(), whatsapp: "0529555057" })).toBeTruthy();
    expect(siteError(fileSiteTexts())).toBeNull();
    expect(promoError(filePromo())).toBeNull();
    expect(promoError({ ...filePromo(), cta: { ...filePromo().cta, href: "javascript:alert(1)" } })).toBeTruthy();
  });

  it("knows what is saved but not yet built into the site", async () => {
    const db = await testDb();
    expect(pendingTexts(await savedTexts(db), {})).toEqual([]);
    await saveText(db, "promo", filePromo());
    await saveText(db, "reviews", { reviews: fileReviews() });
    const saved = await savedTexts(db);
    expect(pendingTexts(saved, {})).toEqual(["promo", "reviews"]);
    expect(pendingTexts(saved, { promo: filePromo(), reviews: { reviews: fileReviews() } })).toEqual([]);
    // removed in the admin, still in the build: pending too
    expect(pendingTexts({}, { faq: { groups: {} } })).toEqual(["faq"]);
  });
});
