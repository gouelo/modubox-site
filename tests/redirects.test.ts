import { describe, expect, it } from "vitest";
import live from "./fixtures/redirects-live.json";
import { compileRules, encodeDestination, fileRules, findRedirect, mergeRules, normalizeSource, ruleWarnings } from "@/lib/seo/redirects";

// tests/fixtures/redirects-live.json: what the live site (next.config redirects)
// answered for every old address on 2026-11-04, before the proxy took them over.
describe("redirects in the proxy", () => {
  const rules = compileRules(fileRules());

  it("answer every old address exactly as next.config did", () => {
    for (const [url, answer] of Object.entries(live as Record<string, string>)) {
      const [pathname, query] = url.split("?");
      const hit = findRedirect(rules, pathname, query ? `?${query}` : "");
      const got = hit ? `${hit.status} ${hit.location}` : "none";
      const expected = answer.startsWith("301") ? answer : "none";
      expect(got, url).toBe(expected);
    }
  });

  it("match without the trailing slash, decoded, any case", () => {
    expect(normalizeSource("/post/%D7%90/")).toBe("/post/א");
    expect(normalizeSource("/")).toBe("/");
    expect(findRedirect(rules, "/TAKANON")?.location).toBe(findRedirect(rules, "/takanon/")?.location);
    expect(encodeDestination("/blog/מחסן/?a=1")).toBe("/blog/%D7%9E%D7%97%D7%A1%D7%9F/?a=1");
    expect(encodeDestination("https://x.co/a b")).toBe("https://x.co/a b");
  });

  it("the admin's rows replace, turn off and add", () => {
    const merged = mergeRules(fileRules(), [
      { source: "/takanon/", destination: "/warranty/", statusCode: 301, enabled: true },
      { source: "/category/:slug*", destination: "/shop/", statusCode: 301, enabled: false },
      { source: "/category/sheds", destination: "/product/modubox-3x3/", statusCode: 301, enabled: true },
    ]);
    const c = compileRules(merged);
    expect(findRedirect(c, "/takanon/")?.location).toBe("/warranty/");
    expect(findRedirect(c, "/category/other/")).toBeNull();
    expect(findRedirect(c, "/category/sheds/")?.location).toBe("/product/modubox-3x3/");
    expect(merged.filter((r) => r.source === "/takanon")).toHaveLength(1);
  });

  it("an exact address wins over a pattern added before it", () => {
    const c = compileRules(mergeRules([], [
      { source: "/old/:rest*", destination: "/shop/", statusCode: 301, enabled: true },
      { source: "/old/one", destination: "/about/", statusCode: 301, enabled: true },
    ]));
    expect(findRedirect(c, "/old/one/")?.location).toBe("/about/");
  });

  it("warns about loops and chains", () => {
    const w = ruleWarnings(mergeRules([], [
      { source: "/a", destination: "/a/", statusCode: 301, enabled: true },
      { source: "/b", destination: "/c/", statusCode: 301, enabled: true },
      { source: "/c", destination: "/shop/", statusCode: 301, enabled: true },
    ]));
    expect(w.get("/a")?.[0]).toMatch(/לולאה/);
    expect(w.get("/b")?.[0]).toMatch(/שרשרת/);
    expect(w.has("/c")).toBe(false);
  });
});
