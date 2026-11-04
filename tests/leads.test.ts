import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db";
import { leads } from "../src/db/schema";
import { checkLead, listLeads, rateLimiter, type NewLead } from "../src/lib/leads";
import { leadEmail, leadsEmailConfig } from "../src/lib/notify";
import { attributionFrom } from "../src/lib/attribution";
import { testDb } from "./db";

// The lead forms: POST /api/lead saves each lead and emails it to the business.
let db: Db | null;
vi.mock("@/db", () => ({ getDb: () => db }));
const { POST } = await import("../src/app/api/lead/route.api");

const env = { RESEND_API_KEY: "re_test", ORDER_EMAIL_TO: "orders@example.com", MAIL_FROM: "Modubox <orders@send.modubox.test>" };
const body = {
  kind: "contact",
  locale: "he",
  name: "דנה כהן",
  phone: "052-1234567",
  email: "dana@example.com",
  city: "חיפה",
  message: "מחסן 3×2 לחצר",
  page: "/contact/",
  attribution: { utm_source: "google", utm_medium: "cpc", utm_campaign: "sheds-nov", gclid: "abc123", landing: "/?utm_source=google", evil: "x" },
};

function stubResend(fail = false) {
  const sent: Record<string, unknown>[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (url !== "https://api.resend.com/emails") throw new Error(`unexpected fetch ${url}`);
      if (fail) return new Response("down", { status: 500 });
      sent.push(JSON.parse(String(init.body)));
      return Response.json({ id: "e1" });
    }),
  );
  return sent;
}

let n = 0;
const post = (b: unknown, ip = `10.0.0.${++n}`) =>
  POST(new Request("https://modubox.test/api/lead/", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(b) }));

beforeEach(async () => {
  db = await testDb();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  for (const m of ["info", "warn", "error"] as const) vi.spyOn(console, m).mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("checking a lead", () => {
  it("keeps the fields, trims them, and only the known attribution keys", () => {
    const r = checkLead({ ...body, name: "  דנה כהן  " });
    expect(r).toMatchObject({ ok: true, lead: { kind: "contact", name: "דנה כהן", phone: "052-1234567", page: "/contact/", attribution: { utm_source: "google", gclid: "abc123" } } });
    expect("lead" in r && r.lead.attribution).not.toHaveProperty("evil");
  });

  it("refuses a bad name, phone or email", () => {
    expect(checkLead({ ...body, name: "x" })).toEqual({ ok: false, error: "invalid_name" });
    expect(checkLead({ ...body, phone: "123" })).toEqual({ ok: false, error: "invalid_phone" });
    expect(checkLead({ ...body, email: "nope" })).toEqual({ ok: false, error: "invalid_email" });
    expect(checkLead({ ...body, locale: "en", phone: "+44 20 7946 0958" })).toMatchObject({ ok: true });
    expect(checkLead("hi")).toEqual({ ok: false, error: "invalid_request" });
  });

  it("the honeypot marks it spam", () => {
    expect(checkLead({ ...body, website: "http://spam.example" })).toEqual({ ok: true, spam: true });
  });

  it("the rate limit lets 5 through in 10 minutes, then again later", () => {
    const allow = rateLimiter();
    for (let i = 0; i < 5; i++) expect(allow("ip", 1000 + i)).toBe(true);
    expect(allow("ip", 2000)).toBe(false);
    expect(allow("other", 2000)).toBe(true);
    expect(allow("ip", 1000 + 10 * 60_000 + 10)).toBe(true);
  });
});

describe("POST /api/lead", () => {
  it("saves the lead, emails it once to ORDER_EMAIL_TO with reply-to, and marks it emailed", async () => {
    const sent = stubResend();
    const res = await post(body);
    expect(res.status).toBe(200);
    const rows = await listLeads(db!);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "דנה כהן", email: "dana@example.com", page: "/contact/", attribution: { utm_campaign: "sheds-nov", gclid: "abc123" } });
    expect(rows[0].emailedAt).not.toBeNull();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: ["orders@example.com"], from: "Modubox <orders@send.modubox.test>", reply_to: "dana@example.com", subject: "ליד חדש מהאתר: דנה כהן · /contact/" });
  });

  it("LEADS_EMAIL_TO wins over ORDER_EMAIL_TO", async () => {
    vi.stubEnv("LEADS_EMAIL_TO", "leads@example.com");
    const sent = stubResend();
    await post(body);
    expect(sent[0].to).toEqual(["leads@example.com"]);
    expect(leadsEmailConfig({ RESEND_API_KEY: "k", ORDER_EMAIL_TO: "a@b.co" })?.to).toEqual(["a@b.co"]);
    expect(leadsEmailConfig({ RESEND_API_KEY: "k" })).toBeNull();
  });

  it("an order without payment keeps its number and the products", async () => {
    stubResend();
    await post({ ...body, kind: "order", orderId: "261104123456", product: "מודובוקס 2×2", page: "/checkout/" });
    expect((await listLeads(db!))[0]).toMatchObject({ kind: "order", orderId: "261104123456", product: "מודובוקס 2×2" });
  });

  it("the email still goes when the database fails", async () => {
    const sent = stubResend();
    db = { insert: () => ({ values: () => ({ returning: async () => Promise.reject(new Error("db down")) }) }) } as unknown as Db;
    expect((await post(body)).status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(console.warn).toHaveBeenCalledWith("[leads] lead emailed but not saved", expect.objectContaining({ name: "דנה כהן" }));
  });

  it("the lead is still saved when the email fails", async () => {
    stubResend(true);
    expect((await post(body)).status).toBe(200);
    const rows = await listLeads(db!);
    expect(rows).toHaveLength(1);
    expect(rows[0].emailedAt).toBeNull();
  });

  it("when both fail, it answers an error (the form offers WhatsApp) and the whole lead is in the logs", async () => {
    stubResend(true);
    db = null;
    expect((await post(body)).status).toBe(502);
    expect(console.error).toHaveBeenCalledWith("[leads] LEAD NOT SAVED OR EMAILED", expect.objectContaining({ phone: "052-1234567" }));
  });

  it("a honeypot hit is answered ok and nothing is kept or sent", async () => {
    const sent = stubResend();
    expect((await post({ ...body, website: "x" })).status).toBe(200);
    expect(await db!.select().from(leads)).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("refuses bad input, and too many leads from one address", async () => {
    stubResend();
    expect((await post({ ...body, phone: "1" })).status).toBe(400);
    for (let i = 0; i < 5; i++) expect((await post(body, "9.9.9.9")).status).toBe(200);
    expect((await post(body, "9.9.9.9")).status).toBe(429);
  });
});

describe("the lead email", () => {
  it("has call and WhatsApp buttons, the message, the ad source, and escapes what was typed", async () => {
    const r = checkLead({ ...body, message: "<script>x</script>", product: "מודובוקס 3×2" });
    if (!("lead" in r)) throw new Error("bad");
    const lead: NewLead = r.lead;
    const m = leadEmail({ ...lead, id: 7, createdAt: new Date("2026-11-04T12:00:00Z") }, "https://modubox.test");
    expect(m.subject).toBe("ליד חדש מהאתר: דנה כהן · מודובוקס 3×2");
    expect(m.html).toContain('dir="rtl"');
    expect(m.html).toContain("tel:+972521234567");
    expect(m.html).toContain("https://wa.me/972521234567");
    expect(m.html).not.toContain("<script>");
    expect(m.text).toContain("<script>x</script>");
    for (const part of [m.html, m.text]) {
      expect(part).toContain("sheds-nov");
      expect(part).toContain("Google Ads (gclid)");
      expect(part).toContain("https://modubox.test/admin/leads/");
    }
  });
});

describe("attribution from the landing URL", () => {
  it("takes the UTM tags and click ids, keeps the first page, and lets a tagged URL replace them", () => {
    const first = attributionFrom("https://modubox.test/p/x/?utm_source=fb&fbclid=F1&other=1", "https://l.facebook.com/", null);
    expect(first).toEqual({ utm_source: "fb", fbclid: "F1", landing: "/p/x/?utm_source=fb&fbclid=F1&other=1", referrer: "l.facebook.com" });
    expect(attributionFrom("https://modubox.test/contact/", "https://modubox.test/p/x/", first)).toBeNull();
    expect(attributionFrom("https://modubox.test/?gclid=G2", "", first)).toEqual({ gclid: "G2", landing: "/?gclid=G2" });
    expect(attributionFrom("https://modubox.test/", "https://modubox.test/x", null)).toEqual({ landing: "/" });
  });
});
