import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { testDb } from "./db";

let db: Db | null = null;
vi.mock("@/db", () => ({ getDb: () => db }));

const { savePageSeo, saveFaqs, savePost, importPosts, saveRedirect, importRedirects, saveSetting, deletePost, slugify } = await import("@/lib/admin/content");
const { readSeo } = await import("@/lib/seo/store");
const { applySeo, metaPath, normalizePath } = await import("@/lib/seo/meta");
const { filePosts, mergePosts } = await import("@/lib/blog");
const { compileRules, fileRules, findRedirect, mergeRules } = await import("@/lib/seo/redirects");
const { business, orgJsonLd } = await import("@/lib/seo/settings");
const { llmsText } = await import("@/lib/seo/llms");
const { analyzeHtml } = await import("@/lib/seo/health");
const { EMPTY } = await import("@/lib/seo/store");
const { catalog, site } = await import("@/lib/catalog");
const { dict } = await import("@/i18n");

beforeEach(async () => {
  db = await testDb();
});

describe("page SEO", () => {
  it("saves, reads and removes a page's overrides", async () => {
    await savePageSeo(db!, "/shop", { title: " קטלוג מחסנים ", description: "תיאור", keyFacts: [{ label: "חומר", value: "פנל" }, { label: "", value: "x" }] });
    let s = (await readSeo()).pages.get("/shop/");
    expect(s?.title).toBe("קטלוג מחסנים");
    expect(s?.keyFacts).toEqual([{ label: "חומר", value: "פנל" }]);
    await savePageSeo(db!, "/shop/", {});
    s = (await readSeo()).pages.get("/shop/");
    expect(s).toBeUndefined();
  });

  it("replaces a page's questions in order", async () => {
    await saveFaqs(db!, "/", [{ q: "א?", a: "1" }, { q: "ב?", a: "2" }, { q: "", a: "x" }]);
    await saveFaqs(db!, "/", [{ q: "ג?", a: "3" }, { q: "א?", a: "1" }]);
    expect((await readSeo()).faqs.get("/")?.map((f) => f.q)).toEqual(["ג?", "א?"]);
  });

  it("puts the saved fields on the page's metadata, and nothing else", () => {
    const base = { title: "קטלוג", description: "d", alternates: { canonical: "/shop/", languages: { en: "/en/shop/" } }, openGraph: { url: "/shop/" } };
    expect(applySeo(base, undefined)).toBe(base);
    const row = { path: "/shop/", title: "חדש", description: null, ogImage: "https://x/y.jpg", canonical: null, noindex: true, keyFacts: [], updatedAt: new Date() };
    const m = applySeo(base, row);
    expect(m.title).toEqual({ absolute: "חדש" });
    expect(m.description).toBe("d");
    expect(m.robots).toEqual({ index: false, follow: true });
    expect(m.openGraph).toMatchObject({ url: "/shop/", title: "חדש", images: [{ url: "https://x/y.jpg" }] });
    expect(m.alternates).toEqual(base.alternates);
    expect(metaPath(base)).toBe("/shop/");
    expect(normalizePath("/blog/%D7%90")).toBe("/blog/א/");
  });

  it("without a database the site gets no overrides", async () => {
    db = null;
    expect(await readSeo()).toBe(EMPTY);
  });
});

describe("blog posts", () => {
  const files = filePosts();
  const first = files[0];

  it("a saved post replaces its file, hidden and draft ones leave the site", async () => {
    await savePost(db!, { slug: first.slug, title: "כותרת חדשה", date: first.date, body: "x", status: "published" }, first.slug);
    let posts = mergePosts(files, (await readSeo()).posts);
    expect(posts.find((p) => p.slug === first.slug)?.title).toBe("כותרת חדשה");
    expect(posts).toHaveLength(files.length);
    await savePost(db!, { slug: first.slug, title: "x", date: first.date, body: "x", status: "hidden" }, first.slug);
    posts = mergePosts(files, (await readSeo()).posts);
    expect(posts.some((p) => p.slug === first.slug)).toBe(false);
    await deletePost(db!, first.slug);
    expect(mergePosts(files, (await readSeo()).posts)[0].title).toBe(first.title);
  });

  it("a new post: its slug from the title, no duplicates, drafts only in preview", async () => {
    const r = await savePost(db!, { slug: "", title: "מחסן חדש 2027!", date: "2027-01-01", body: "גוף", status: "draft" });
    expect(r).toEqual({ ok: true, slug: "מחסן-חדש-2027" });
    expect(mergePosts(files, (await readSeo()).posts).some((p) => p.slug === "מחסן-חדש-2027")).toBe(false);
    expect(mergePosts(files, (await readSeo()).posts, true)[0].slug).toBe("מחסן-חדש-2027");
    expect(await savePost(db!, { slug: first.slug, title: "t", date: "2027-01-01", body: "", status: "draft" })).toMatchObject({ ok: false });
    expect(await savePost(db!, { slug: "a", title: "t", date: "1/1/2027", body: "", status: "draft" })).toMatchObject({ ok: false });
  });

  it("a new address hides the file post and redirects the old one", async () => {
    const r = await savePost(db!, { slug: "new-address", title: first.title, date: first.date, body: first.body, status: "published" }, first.slug);
    expect(r).toEqual({ ok: true, slug: "new-address" });
    const seo = await readSeo();
    const posts = mergePosts(files, seo.posts);
    expect(posts.some((p) => p.slug === first.slug)).toBe(false);
    expect(posts.some((p) => p.slug === "new-address")).toBe(true);
    const rows = await db!.query.redirects.findMany();
    const rules = compileRules(mergeRules(fileRules(), rows));
    expect(findRedirect(rules, `/blog/${encodeURIComponent(first.slug)}/`)?.location).toBe("/blog/new-address/");
  });

  it("imports the files once", async () => {
    expect(await importPosts(db!)).toBe(files.length);
    expect(await importPosts(db!)).toBe(0);
    expect(mergePosts(files, (await readSeo()).posts).map((p) => [p.slug, p.title, p.body])).toEqual(files.map((p) => [p.slug, p.title, p.body]));
  });

  it("slugs keep Hebrew letters and digits", () => {
    expect(slugify("  איך לבחור מחסן? (2026) ")).toBe("איך-לבחור-מחסן-2026");
  });
});

describe("redirects table", () => {
  it("validates, saves and overrides the file", async () => {
    expect(await saveRedirect(db!, { source: "/admin/x", destination: "/", statusCode: 301, enabled: true })).toMatchObject({ ok: false });
    expect(await saveRedirect(db!, { source: "/x", destination: "shop", statusCode: 301, enabled: true })).toMatchObject({ ok: false });
    expect(await saveRedirect(db!, { source: "/x/", destination: "/x", statusCode: 301, enabled: true })).toMatchObject({ ok: false });
    expect(await saveRedirect(db!, { source: "/takanon/", destination: "/warranty/", statusCode: 301, enabled: true })).toEqual({ ok: true });
    const rules = compileRules(mergeRules(fileRules(), await db!.query.redirects.findMany()));
    expect(findRedirect(rules, "/takanon/")?.location).toBe("/warranty/");
  });

  it("imports the file once, and the import answers the same", async () => {
    expect(await importRedirects(db!)).toBe(187);
    expect(await importRedirects(db!)).toBe(0);
    const fromDb = compileRules(mergeRules(fileRules(), await db!.query.redirects.findMany()));
    const fromFile = compileRules(fileRules());
    for (const p of ["/takanon/", "/post/anything/", "/product-page/%D7%9E%D7%97%D7%A1%D7%9F-%D7%9E%D7%95%D7%93%D7%95%D7%91%D7%95%D7%A7%D7%A1/", "/shop/"]) expect(findRedirect(fromDb, p)?.location).toBe(findRedirect(fromFile, p)?.location);
  });
});

describe("site settings", () => {
  it("the business JSON-LD is unchanged until something is saved", () => {
    for (const locale of ["he", "en"] as const) {
      const s = catalog(locale).site;
      expect(orgJsonLd(business({}, locale), locale)).toEqual({
        "@context": "https://schema.org",
        "@type": "HomeAndConstructionBusiness",
        name: dict(locale).meta.siteName,
        url: site.url,
        telephone: s.phone,
        email: s.email,
        address: { "@type": "PostalAddress", streetAddress: s.factory, addressCountry: "IL" },
        aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.reviewCount },
        sameAs: Object.values(s.social),
      });
    }
  });

  it("saved business fields show; Hebrew text stays off the English pages", async () => {
    await saveSetting(db!, "business", { city: "עין חרוד", geo: "32.55,35.39", openingHours: ["Su-Th 08:00-17:00"], rating: 4.8, phone: "" });
    const saved = (await readSeo()).business;
    const he = orgJsonLd(business(saved, "he"), "he");
    expect(he).toMatchObject({ address: { addressLocality: "עין חרוד" }, geo: { latitude: 32.55, longitude: 35.39 }, openingHours: ["Su-Th 08:00-17:00"], aggregateRating: { ratingValue: 4.8 }, telephone: site.phone });
    const en = orgJsonLd(business(saved, "en"), "en") as { address: Record<string, unknown> };
    expect(en.address.addressLocality).toBeUndefined();
  });

  it("llms.txt: the generated guide, with the saved opening and extras", () => {
    const plain = llmsText(EMPTY);
    expect(plain).toContain(`> ${site.tagline}.`);
    expect(plain).toContain("## מוצרים");
    const custom = llmsText({ ...EMPTY, llms: { intro: "פתיח שלנו", extra: "## אזורי שירות\n\n- כל הארץ" } });
    expect(custom).toContain("> פתיח שלנו");
    expect(custom.trim().endsWith("- כל הארץ")).toBe(true);
  });
});

describe("health check", () => {
  it("reads a page as a search engine would", () => {
    const html = `<html><head><title>מחסן 3×3 מפנל מבודד | מודובוקס Modubox</title><meta name="description" content="קצר"><link rel="canonical" href="https://www.modubox.com/shop/"><meta property="og:title" content="t"></head>
      <body><main><h1>א</h1><h2>ב</h2><img src="a.jpg"><img src="b.jpg" alt=""><a href="/x/">x</a><p>${"מילה ".repeat(400)}</p></main>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage"}</script><script type="application/ld+json">[{"@type":"HomeAndConstructionBusiness"}]</script></body></html>`;
    const h = analyzeHtml(html, "https://www.modubox.com/shop/");
    const by = (label: string) => h.checks.find((c) => c.label.startsWith(label))!;
    expect(by("כותרת (title)").level).toBe("ok");
    expect(by("תיאור").level).toBe("warn");
    expect(by("כותרת ראשית").level).toBe("ok");
    expect(by("טקסט חלופי").level).toBe("bad");
    expect(by("שאלות ותשובות").level).toBe("ok");
    expect(by("ישות העסק").level).toBe("ok");
    expect(by("כתובת קנונית").level).toBe("ok");
    expect(h.jsonLdTypes).toEqual(["FAQPage", "HomeAndConstructionBusiness"]);
    expect(h.score).toBeGreaterThan(50);
  });
});

describe("robots.txt", () => {
  it("keeps the cart, checkout, admin and API out, for everyone and in each AI crawler's own group", async () => {
    const { default: robots, DISALLOW } = await import("@/app/robots");
    const { AI_CRAWLERS } = await import("@/lib/seo/settings");
    expect(DISALLOW).toEqual(expect.arrayContaining(["/admin/", "/api/", "/cart/", "/checkout/", "/en/cart/", "/en/checkout/"]));
    let rules = [(await robots()).rules].flat();
    expect(rules[0]).toEqual({ userAgent: "*", allow: "/", disallow: DISALLOW });
    for (const a of ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot"])
      expect(rules).toContainEqual({ userAgent: a, allow: "/", disallow: DISALLOW });
    expect(rules).toHaveLength(1 + AI_CRAWLERS.length);

    await saveSetting(db!, "crawlers", { CCBot: "block", GPTBot: "allow" });
    rules = [(await robots()).rules].flat();
    expect(rules).toContainEqual({ userAgent: "CCBot", disallow: "/" });
    expect(rules).toContainEqual({ userAgent: "GPTBot", allow: "/", disallow: DISALLOW });
  });
});
