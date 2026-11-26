import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { GAMBOT_TIMEOUT_MS, gambotPayload, sendLeadToGambot } from "../src/lib/gambot";
import { checkLead, handleLead, type NewLead } from "../src/lib/leads";

// Leads also go to Gambot's webhook (GAMBOT_LEAD_WEBHOOK_URL): mocked fetch only, never the live endpoint.
const WEBHOOK = "https://gambot.example.test/api/external/webhooks/570067264/new_lead_modubox?token=test-secret";
const lead: NewLead = {
  kind: "contact",
  locale: "he",
  name: "דנה כהן",
  phone: "052-1234567",
  email: "dana@example.com",
  city: "חיפה",
  message: "מחסן 3×2 לחצר",
  page: "/contact/",
  product: null,
  orderId: null,
  attribution: { utm_source: "google", utm_medium: "cpc", utm_campaign: "sheds-nov", gclid: "abc123", landing: "/?utm_source=google" },
};
const at = new Date("2026-11-26T09:30:00.000Z");
const okFetch = vi.fn(async () => new Response("{}", { status: 200 }));

describe("gambotPayload", () => {
  it("sends the phone as 0XXXXXXXXX and as +972, the attribution flat, and the time", () => {
    expect(gambotPayload(lead, at)).toEqual({
      name: "דנה כהן",
      phone: "0521234567",
      phone_intl: "+972521234567",
      email: "dana@example.com",
      city: "חיפה",
      message: "מחסן 3×2 לחצר",
      kind: "contact",
      page: "/contact/",
      product: null,
      order_id: null,
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "sheds-nov",
      utm_term: null,
      utm_content: null,
      gclid: "abc123",
      fbclid: null,
      created_at: "2026-11-26T09:30:00.000Z",
    });
  });

  it("keeps a number from abroad as +digits", () => {
    const p = gambotPayload({ ...lead, phone: "+44 20 7946 0958" }, at);
    expect(p.phone).toBe("+442079460958");
    expect(p.phone_intl).toBe("+442079460958");
  });
});

describe("sendLeadToGambot", () => {
  it("does nothing when the webhook isn't set", async () => {
    const f = vi.fn(okFetch);
    expect(await sendLeadToGambot(lead, at, undefined, f)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("posts the JSON to the webhook and reports success", async () => {
    const f = vi.fn(okFetch);
    expect(await sendLeadToGambot(lead, at, WEBHOOK, f)).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
    const [to, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(to).toBe(WEBHOOK);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body)).phone_intl).toBe("+972521234567");
    expect(init.signal).toBeTruthy();
  });

  it("returns false on a refusal, and on a network error, without throwing", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendLeadToGambot(lead, at, WEBHOOK, vi.fn(async () => new Response("no", { status: 500 })))).toBe(false);
    expect(
      await sendLeadToGambot(lead, at, WEBHOOK, vi.fn(async () => {
        throw new Error("socket hang up");
      })),
    ).toBe(false);
    // the logs never carry the token
    expect(JSON.stringify(errSpy.mock.calls)).not.toContain("test-secret");
    errSpy.mockRestore();
  });

  it("gives up after the short timeout", async () => {
    vi.useFakeTimers();
    const hang = vi.fn((_u: string, init: RequestInit) => new Promise<Response>((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    }));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const done = sendLeadToGambot(lead, at, WEBHOOK, hang as unknown as typeof fetch);
    await vi.advanceTimersByTimeAsync(GAMBOT_TIMEOUT_MS);
    expect(await done).toBe(false);
    errSpy.mockRestore();
    vi.useRealTimers();
  });
});

describe("handleLead with Gambot", () => {
  it("does not throw when Gambot fails, and posts the lead to it", async () => {
    vi.stubEnv("GAMBOT_LEAD_WEBHOOK_URL", WEBHOOK);
    const f = vi.fn(async () => {
      throw new Error("down");
    });
    vi.stubGlobal("fetch", f);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const checked = checkLead({ ...lead, kind: "contact", locale: "he" });
    if (!checked.ok || "spam" in checked) throw new Error("lead should check");
    const r = await handleLead(null, checked.lead, "https://www.modubox.com", at);
    expect(r.saved).toBe(false); // no database in this test
    expect(f).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});

describe("the call widget file", () => {
  const src = readFileSync(new URL("../public/gambot-call.js", import.meta.url), "utf8");

  it("has the config fixed: the API quoted, the number with its leading 0", () => {
    expect(src).toContain('"api":"https://gambot.azurewebsites.net"');
    expect(src).toContain('"tel":"0747066620","display":"074-7066620"');
    expect(src).not.toMatch(/"tel":"747066620"/);
  });
});
