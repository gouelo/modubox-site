import fs from "node:fs";
import { describe, expect, it } from "vitest";
import redirects from "../data/redirects.json";
import { allPosts, imageSize, parsePost } from "@/lib/blog";
import { products } from "@/lib/catalog";
import { consentState } from "@/lib/consent";

describe("blog", () => {
  const posts = allPosts();
  it("has all 22 migrated posts, newest first, each complete", () => {
    expect(posts).toHaveLength(22);
    for (const p of posts) {
      expect(p.title && p.description && p.body.length > 300).toBeTruthy();
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect([...posts].sort((a, b) => b.date.localeCompare(a.date)).map((p) => p.slug)).toEqual(posts.map((p) => p.slug));
  });
  it("every image is in public/images with its size", () => {
    for (const p of posts) {
      const imgs = [p.cover, ...[...p.body.matchAll(/^!\[.*?\]\((\S+)\)$/gm)].map((m) => m[1])].filter(Boolean) as string[];
      for (const src of imgs) {
        expect(fs.existsSync(`public/images/${src}`), src).toBe(true);
        expect(imageSize(src), src).toBeDefined();
      }
    }
  });
  it("links point to the new site, not the old one", () => {
    for (const p of posts) expect(p.body, p.slug).not.toMatch(/\]\(https?:\/\/(www\.)?modubox\.com/);
  });
  it("reads the --- header", () => {
    expect(parsePost("x", '---\n{"title":"t","seoTitle":"t","description":"d","date":"2020-01-01","updated":"2020-01-01","categories":[]}\n---\n\nbody').body).toBe("body");
  });
});

describe("redirects from the old site", () => {
  const sources = redirects.map((r) => r.source);
  const pages = new Set(["/", "/shop/", "/gallery/", "/faq/", "/about/", "/contact/", "/terms/", "/warranty/", "/accessibility/", "/privacy/", "/cart/", "/blog/"]);
  const slugs = new Set(allPosts().map((p) => p.slug));
  it("no source twice, every one permanent to a page that exists", () => {
    expect(new Set(sources).size).toBe(sources.length);
    for (const r of redirects) {
      const d = r.destination.replace(/^\/en(?=\/)/, "");
      const ok = pages.has(d) || (d.startsWith("/product/") && products.some((p) => `/product/${p.slug}/` === d)) || (d.startsWith("/blog/") && slugs.has(d.slice(6, -1)));
      expect(ok, `${r.source} → ${r.destination}`).toBe(true);
    }
  });
  it("covers every old product, page and post", () => {
    expect(redirects.filter((r) => r.kind === "product")).toHaveLength(42);
    expect(redirects.filter((r) => r.kind === "blog")).toHaveLength(22);
    expect(sources).toContain("/takanon");
    expect(sources).toContain("/post/:slug*");
  });
});

describe("consent", () => {
  it("denied until chosen, then per category", () => {
    expect(consentState(null)).toEqual({ ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
    expect(consentState({ analytics: true, ads: false })).toMatchObject({ analytics_storage: "granted", ad_storage: "denied" });
  });
});
