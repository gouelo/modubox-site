import { describe, expect, it } from "vitest";
import live from "./fixtures/redirects-live.json";
import { compileRules, encodeDestination, englishHostRedirect, fileRules, findRedirect, keptQuery, mergeRules, normalizeSource, routeRequest, ruleWarnings } from "@/lib/seo/redirects";

// tests/fixtures/redirects-live.json: every old address the live site answered on
// 2026-11-04 (then next.config's redirects), with the proxy's answer since the SEO
// migration (2026-11-08): the category pages answer on their own addresses, the
// add-ons go to /shed-accessories/, and the query is dropped but for campaign tags.
describe("redirects in the proxy", () => {
  const rules = compileRules(fileRules());

  it("answer every old address in one hop", () => {
    for (const [url, answer] of Object.entries(live as Record<string, string>)) {
      const [pathname, query] = url.split("?");
      const r = routeRequest(rules, pathname, query ? `?${query}` : "");
      expect(r ? `${r.status} ${r.location}` : "none", url).toBe(answer);
      // where it lands needs no second redirect
      if (r) expect(routeRequest(rules, ...(r.location.split(/(?=\?)/) as [string, string?])), url).toBeNull();
    }
  });

  it("keeps campaign tags only, and cleans the old site's parameters", () => {
    expect(keptQuery("?utm_source=g&page=2&gclid=x&a=1")).toBe("utm_source=g&gclid=x");
    expect(findRedirect(rules, "/takanon/", "?utm_medium=cpc&x=1")?.location).toBe("/terms/?utm_medium=cpc");
    expect(routeRequest(rules, "/shop", "?page=2&utm_source=g")).toEqual({ location: "/shop/?utm_source=g", status: 301 });
    expect(routeRequest(rules, "/shop", "?q=1")).toEqual({ location: "/shop/?q=1", status: 308 });
    expect(routeRequest(rules, "/shop/", "?gsas=1&rwg_token=2")).toEqual({ location: "/shop/", status: 301 });
    expect(routeRequest(rules, "/shop/", "?q=1")).toBeNull();
  });

  it("send the old English subdomain to the English site on www, path kept, in one hop", () => {
    const en = (host: string, path: string, q = "") => englishHostRedirect(rules, host, path, q);
    expect(en("en.modubox.com", "/")).toEqual({ location: "https://www.modubox.com/en/", status: 301 });
    expect(en("EN.modubox.com:443", "/shop")).toEqual({ location: "https://www.modubox.com/en/shop/", status: 301 });
    expect(en("en.modubox.com", "/shop/", "?utm_source=g")).toEqual({ location: "https://www.modubox.com/en/shop/?utm_source=g", status: 301 });
    expect(en("en.modubox.com", "/en/faq/")).toEqual({ location: "https://www.modubox.com/en/faq/", status: 301 });
    // an old English product page goes straight to its new page
    const old = en("en.modubox.com", "/product-page/%D7%9E%D7%97%D7%A1%D7%9F-%D7%9E%D7%95%D7%93%D7%95%D7%91%D7%95%D7%A7%D7%A1");
    expect(old?.location).toBe(`https://www.modubox.com${routeRequest(rules, "/en/product-page/%D7%9E%D7%97%D7%A1%D7%9F-%D7%9E%D7%95%D7%93%D7%95%D7%91%D7%95%D7%A7%D7%A1")!.location}`);
    expect(old?.location).not.toContain("product-page");
    expect(en("www.modubox.com", "/")).toBeNull();
    expect(en("he.modubox.com", "/")).toBeNull();
    expect(englishHostRedirect(rules, null, "/")).toBeNull();
  });

  it("capitals go to the lower-case page; the admin, the API and files are left alone", () => {
    expect(routeRequest(rules, "/EVEREST")).toEqual({ location: "/everest/", status: 301 });
    expect(routeRequest(rules, "/Blog/%D7%90/")).toEqual({ location: "/blog/%D7%90/", status: 301 });
    expect(routeRequest(rules, "/blog/%D7%90/")).toBeNull();
    expect(routeRequest(rules, "/api/health")).toEqual({ location: "/api/health/", status: 308 });
    expect(routeRequest(rules, "/admin/", "?page=2")).toBeNull();
    expect(routeRequest(rules, "/sitemap.xml")).toBeNull();
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
