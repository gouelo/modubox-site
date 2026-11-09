import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db";
import { visits, visitSalts } from "../src/db/schema";
import { visitHosts } from "../src/lib/analytics";
import { channelOf, checkVisit, dailySalt, deviceOf, isBot, referrerHostOf, resetSaltCache, visitorHash } from "../src/lib/visits";
import { testDb } from "./db";

// The site's own cookieless visit statistics: POST /api/visit/ from the beacon on public pages.
let db: Db | null;
vi.mock("@/db", () => ({ getDb: () => db }));
const { POST } = await import("../src/app/api/visit/route.api");

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

function hit(body: unknown, { host = "www.modubox.com", ua = IPHONE, ip = "203.0.113.7", cookie = "" } = {}) {
  return POST(
    new Request(`https://${host}/api/visit/`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": ua, "x-forwarded-for": `${ip}, 10.0.0.1`, ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );
}

describe("visit helpers", () => {
  it("counts on the real domain only", () => {
    expect(visitHosts()).toEqual(["www.modubox.com", "modubox.com"]);
  });

  it("tells people from bots", () => {
    expect(isBot(IPHONE)).toBe(false);
    expect(isBot(MAC)).toBe(false);
    expect(isBot("")).toBe(true);
    expect(isBot("curl/8.5.0")).toBe(true);
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36")).toBe(true);
    expect(isBot("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe(true);
  });

  it("phones and tablets are mobile", () => {
    expect(deviceOf(IPHONE)).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-S918B) Mobile Safari/537.36")).toBe("mobile");
    expect(deviceOf(MAC)).toBe("desktop");
  });

  it("groups sources: Google, Facebook/Instagram, direct, other", () => {
    expect(channelOf({ referrerHost: "www.google.com", utmSource: null })).toBe("google");
    expect(channelOf({ referrerHost: "www.google.co.il", utmSource: null })).toBe("google");
    expect(channelOf({ referrerHost: null, utmSource: null, gclid: true })).toBe("google");
    expect(channelOf({ referrerHost: null, utmSource: "ig" })).toBe("facebook");
    expect(channelOf({ referrerHost: "l.facebook.com", utmSource: null })).toBe("facebook");
    expect(channelOf({ referrerHost: null, utmSource: null, fbclid: true })).toBe("facebook");
    expect(channelOf({ referrerHost: null, utmSource: null })).toBe("direct");
    expect(channelOf({ referrerHost: "www.bing.com", utmSource: null })).toBe("other");
    expect(channelOf({ referrerHost: null, utmSource: "newsletter" })).toBe("other");
  });

  it("keeps only another site's host as the referrer", () => {
    const own = visitHosts();
    expect(referrerHostOf("https://www.google.com/search?q=secret", own)).toBe("www.google.com");
    expect(referrerHostOf("https://www.modubox.com/shop/", own)).toBeNull();
    expect(referrerHostOf("javascript:alert(1)", own)).toBeNull();
    expect(referrerHostOf("", own)).toBeNull();
  });

  it("checks the report: a known kind and a public page", () => {
    expect(checkVisit({ kind: "pageview", path: "/product/%D7%9E/?x=1" })).toMatchObject({ kind: "pageview", path: "/product/מ/" });
    expect(checkVisit({ kind: "pageview", path: "/admin/orders/" })).toBeNull();
    expect(checkVisit({ kind: "pageview", path: "/admin" })).toBeNull();
    expect(checkVisit({ kind: "pageview", path: "/api/lead/" })).toBeNull();
    expect(checkVisit({ kind: "purchase", path: "/" })).toBeNull();
    expect(checkVisit({ kind: "pageview", path: "https://evil.example/" })).toBeNull();
    expect(checkVisit({ kind: "pageview", path: "//evil.example/" })).toBeNull();
    expect(checkVisit(null)).toBeNull();
  });

  it("the visitor hash is the same within a salt, different across salts, and never the IP", async () => {
    const a = await visitorHash("salt-1", "203.0.113.7", IPHONE);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(await visitorHash("salt-1", "203.0.113.7", IPHONE)).toBe(a);
    expect(await visitorHash("salt-2", "203.0.113.7", IPHONE)).not.toBe(a);
    expect(await visitorHash("salt-1", "203.0.113.8", IPHONE)).not.toBe(a);
  });
});

describe("POST /api/visit/", () => {
  beforeEach(async () => {
    db = await testDb();
    resetSaltCache();
  });

  it("records a page view: page, source, device and a hashed visitor, no IP or user agent", async () => {
    const res = await hit({ kind: "pageview", path: "/shop/", entry: true, referrer: "https://www.google.com/", utm_source: "Google", utm_medium: "CPC" });
    expect(res.status).toBe(204);
    const rows = await db!.select().from(visits);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "pageview", path: "/shop/", referrerHost: "www.google.com", utmSource: "google", utmMedium: "cpc", channel: "google", device: "mobile" });
    expect(rows[0].visitor).toMatch(/^[0-9a-f]{16}$/);
    const stored = JSON.stringify(rows);
    expect(stored).not.toContain("203.0.113.7");
    expect(stored).not.toContain("iPhone");
  });

  it("a move inside the site and a click have no source", async () => {
    await hit({ kind: "pageview", path: "/faq/", entry: false, referrer: "https://www.google.com/" });
    await hit({ kind: "whatsapp_click", path: "/faq/" });
    const rows = await db!.select().from(visits);
    expect(rows.map((r) => [r.kind, r.channel, r.referrerHost])).toEqual([
      ["pageview", null, null],
      ["whatsapp_click", null, null],
    ]);
  });

  it("the same person the same day is one visitor", async () => {
    await hit({ kind: "pageview", path: "/", entry: true });
    await hit({ kind: "pageview", path: "/shop/" });
    await hit({ kind: "pageview", path: "/", entry: true }, { ip: "198.51.100.1", ua: MAC });
    const rows = await db!.select().from(visits);
    expect(new Set(rows.map((r) => r.visitor)).size).toBe(2);
  });

  it("doesn't count previews, bots, the admin, or someone signed in to the admin", async () => {
    await hit({ kind: "pageview", path: "/" }, { host: "modubox-site.vercel.app" });
    await hit({ kind: "pageview", path: "/" }, { host: "modubox-site-git-x-gouelo.vercel.app" });
    await hit({ kind: "pageview", path: "/" }, { ua: "curl/8.5.0" });
    await hit({ kind: "pageview", path: "/admin/" });
    await hit({ kind: "pageview", path: "/" }, { cookie: "a=1; mbx_admin=v1.x.y" });
    await hit("not json");
    expect(await db!.select().from(visits)).toHaveLength(0);
  });

  it("answers 204 without a database", async () => {
    db = null;
    expect((await hit({ kind: "pageview", path: "/" })).status).toBe(204);
  });

  it("keeps a random salt a day and deletes the ones before yesterday", async () => {
    const s1 = await dailySalt(db!, "2026-11-07");
    resetSaltCache();
    await dailySalt(db!, "2026-11-08");
    resetSaltCache();
    expect(await dailySalt(db!, "2026-11-08")).not.toBe(s1);
    resetSaltCache();
    await dailySalt(db!, "2026-11-09");
    const days = (await db!.select().from(visitSalts)).map((r) => r.day).sort();
    expect(days).toEqual(["2026-11-08", "2026-11-09"]);
  });
});
