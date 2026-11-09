import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db";
import { leads, orderItems, orders, visits } from "../src/db/schema";
import type { AdminSession } from "../src/lib/admin/auth";
import { ask, askEnabled, checkSql, ROW_CAP, runReadOnly, systemPrompt } from "../src/lib/admin/ask";
import { rangeDays, readRange, stats } from "../src/lib/admin/stats";
import { testDb } from "./db";

// The "נתונים" page (/admin/stats) and its AI question box.
let db: Db;
let session: AdminSession | null = null;
vi.mock("@/db", () => ({ getDb: () => db }));
vi.mock("@/lib/admin/session", () => ({ getSession: async () => session }));
const { POST } = await import("../src/app/api/admin/ask/route.api");

const NOW = new Date("2026-11-09T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

async function order(id: string, o: { paidDaysAgo?: number; status?: "new" | "cancelled" | "pending_payment"; total: number; isTest?: boolean; items: { slug: string; name: string; qty: number; addons?: { label: string; qty: number; gift?: boolean }[] }[] }) {
  const paidAt = o.paidDaysAgo === undefined ? null : daysAgo(o.paidDaysAgo);
  await db.insert(orders).values({ id, customerName: "דנה כהן", customerPhone: "052-1234567", customerKey: "0521234567", customerEmail: "dana@example.com", total: o.total, status: o.status ?? (paidAt ? "new" : "pending_payment"), paidAt, createdAt: paidAt ?? NOW, isTest: o.isTest ?? false });
  for (const [i, it] of o.items.entries()) {
    await db.insert(orderItems).values({
      orderId: id, position: i, productSlug: it.slug, productName: it.name, qty: it.qty, basePrice: 1000, unitTotal: 1000, itemsTotal: 1000 * it.qty,
      addons: (it.addons ?? []).map((a) => ({ ...a, unitPrice: 0, total: 0 })), fulfillment: "pickup", fulfillmentLabel: "איסוף",
    });
  }
}

async function seed() {
  await order("o1", { paidDaysAgo: 1, total: 9000, items: [{ slug: "modubox-3x2", name: "מחסן מודובוקס 3×2", qty: 1, addons: [{ label: "חלון הזזה", qty: 2 }, { label: "מתנה: רצפה", qty: 1, gift: true }] }] });
  await order("o2", { paidDaysAgo: 3, total: 12000, items: [{ slug: "modubox-3x2", name: "מחסן מודובוקס 3×2", qty: 2, addons: [{ label: "מדף", qty: 1 }] }] });
  await order("o3", { paidDaysAgo: 40, total: 5000, items: [{ slug: "modubox-2x2", name: "מחסן מודובוקס 2×2", qty: 1 }] });
  await order("t1", { paidDaysAgo: 1, total: 1, isTest: true, items: [{ slug: "test", name: "מוצר בדיקה", qty: 5 }] });
  await order("c1", { paidDaysAgo: 2, status: "cancelled", total: 7000, items: [{ slug: "modubox-4x2", name: "מחסן מודובוקס 4×2", qty: 1 }] });
  await order("p1", { total: 7000, items: [{ slug: "modubox-4x2", name: "מחסן מודובוקס 4×2", qty: 1 }] });
  await db.insert(leads).values([
    { kind: "contact", name: "יוסי", phone: "050-0000000", createdAt: daysAgo(2), attribution: { utm_source: "google", gclid: "x" } },
    { kind: "order", name: "רות", phone: "050-1111111", createdAt: daysAgo(50) },
    // deleted in the admin: in no count, and not in the AI's view
    { kind: "contact", name: "נמחק", phone: "050-2222222", createdAt: daysAgo(1), deletedAt: daysAgo(0), deletedBy: "sales" },
  ]);
  const v = (day: string, visitor: string, o: Partial<typeof visits.$inferInsert> = {}) => ({ day, visitor, kind: "pageview" as const, path: "/", device: "mobile" as const, ...o });
  await db.insert(visits).values([
    v("2026-11-08", "a", { channel: "google", referrerHost: "www.google.com" }),
    v("2026-11-08", "a", { path: "/shop/" }),
    v("2026-11-08", "b", { channel: "direct", device: "desktop" }),
    v("2026-11-09", "a", { channel: "facebook" }),
    v("2026-11-08", "a", { kind: "whatsapp_click", path: "/shop/" }),
    v("2026-11-09", "a", { kind: "phone_click" }),
    v("2026-09-01", "z", { channel: "other" }),
  ]);
}

describe("stats page numbers", () => {
  beforeEach(async () => {
    db = await testDb();
    await seed();
  });

  it("reads the range", () => {
    expect(readRange("1")).toBe(1);
    expect(readRange("7")).toBe(7);
    expect(readRange("90")).toBe(90);
    expect(readRange("12")).toBe(30);
    expect(readRange(undefined)).toBe(30);
    const d = rangeDays(7, NOW);
    expect(d).toHaveLength(7);
    expect(d[0]).toBe("2026-11-03");
    expect(d[6]).toBe("2026-11-09");
  });

  it("counts visitors, sales, leads, clicks and conversion; test and cancelled orders are left out", async () => {
    const s = await stats(db, 30, NOW);
    expect(s.daily.find((d) => d.day === "2026-11-08")).toEqual({ day: "2026-11-08", visitors: 2, pageviews: 3 });
    expect(s.visitors).toBe(3);
    expect(s.pageviews).toBe(4);
    expect(s.orders).toBe(2);
    expect(s.revenue).toBe(21000);
    expect(s.leads).toBe(1);
    expect(s.whatsapp).toBe(1);
    expect(s.phone).toBe(1);
    expect(s.conversion).toBe(1);
    expect(s.countingSince).toBe("2026-09-01");
    expect(s.products).toEqual([{ label: "מחסן מודובוקס 3×2", value: 3, extra: 3000 }]);
    // gifts aren't a choice; an add-on counts once per shed
    expect([...s.addons].sort((a, b) => a.label.localeCompare(b.label))).toEqual([
      { label: "חלון הזזה", value: 2 },
      { label: "מדף", value: 2 },
    ]);
    expect(s.pages[0]).toEqual({ label: "/", value: 3 });
    expect(s.sources.map((x) => x.label).sort()).toEqual(["Google", "ישירות", "פייסבוק / אינסטגרם"]);
    expect([...s.devices].sort((a, b) => a.label.localeCompare(b.label))).toEqual([
      { label: "מחשב", value: 1, extra: 0.5 },
      { label: "נייד", value: 1, extra: 0.5 },
    ]);
  });

  it("90 days reaches the older order", async () => {
    const s = await stats(db, 90, NOW);
    expect(s.orders).toBe(3);
    expect(s.leads).toBe(2);
  });
});

describe("the AI's read-only SQL", () => {
  beforeEach(async () => {
    db = await testDb();
    await seed();
  });

  it("allows one SELECT and refuses everything else", () => {
    expect(checkSql("select count(*) from orders;")).toEqual({ ok: true, sql: "select count(*) from orders" });
    expect(checkSql("WITH x AS (select 1) select * from x").ok).toBe(true);
    for (const bad of [
      "delete from orders",
      "select 1; delete from orders",
      "select * from public.orders",
      'select * from "public".orders',
      "select * from pg_user",
      "select * from information_schema.tables",
      "select current_setting('search_path')",
      "select query_to_xml('select * from x', true, true, '')",
      "select 1 -- x",
      "select /* x */ 1",
      "select $$a$$",
      'select * from U&"\\0070ublic".orders',
      "",
      42,
    ]) {
      expect(checkSql(bad).ok, String(bad)).toBe(false);
    }
  });

  it("sees the views only: no test orders, no customer details", async () => {
    const r = await runReadOnly(db, "select id from orders order by id");
    expect(r).toEqual({ ok: true, rows: [{ id: "c1" }, { id: "o1" }, { id: "o2" }, { id: "o3" }, { id: "p1" }], truncated: false });
    const sales = await runReadOnly(db, "select sum(i.qty)::int as n from order_items i join orders o on o.id = i.order_id where o.is_sale and i.product_name ilike '%3×2%'");
    expect(sales).toEqual({ ok: true, rows: [{ n: 3 }], truncated: false });
    const addons = await runReadOnly(db, "select label, gift from order_item_addons order by label");
    expect(addons.ok && addons.rows).toHaveLength(3);
    expect((await runReadOnly(db, "select customer_name from orders")).ok).toBe(false);
    expect(await runReadOnly(db, "select count(*)::int as n from leads")).toEqual({ ok: true, rows: [{ n: 2 }], truncated: false });
    expect((await runReadOnly(db, "select customer_phone from orders")).ok).toBe(false);
    expect((await runReadOnly(db, "select name from leads")).ok).toBe(false);
    expect((await runReadOnly(db, "select * from coupons")).ok).toBe(false);
    expect((await runReadOnly(db, "select * from site_settings")).ok).toBe(false);
  });

  it("can't write, even through a CTE", async () => {
    const r = await runReadOnly(db, "with gone as (delete from orders returning id) select * from gone");
    expect(r.ok).toBe(false);
    expect(await db.select().from(orders)).toHaveLength(6);
  });

  it("caps the rows", async () => {
    const r = await runReadOnly(db, "select g from generate_series(1, 500) g");
    expect(r.ok && r.rows.length).toBe(ROW_CAP);
    expect(r.ok && r.truncated).toBe(true);
  });
});

/** A fake Anthropic client: answers from a script, records what it was sent. */
function fakeClient(script: ((params: Anthropic.Beta.MessageCreateParamsNonStreaming) => Partial<Anthropic.Beta.BetaMessage>)[]) {
  const sent: Anthropic.Beta.MessageCreateParamsNonStreaming[] = [];
  const create = vi.fn(async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => {
    sent.push(structuredClone(params));
    return script[sent.length - 1](params);
  });
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, sent };
}

describe("ask()", () => {
  beforeEach(async () => {
    db = await testDb();
    await seed();
  });

  it("without ANTHROPIC_API_KEY it says how to set it", async () => {
    expect(askEnabled({})).toBe(false);
    expect(askEnabled({ ANTHROPIC_API_KEY: "sk-ant-x" })).toBe(true);
    const r = await ask(db, "כמה הזמנות?", { env: {} });
    expect(r).toMatchObject({ ok: false, error: "no_key" });
    expect(!r.ok && r.message).toContain("ANTHROPIC_API_KEY");
  });

  it("runs the model's query and returns its Hebrew answer", async () => {
    const { client, sent } = fakeClient([
      () => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "run_sql", input: { sql: "select count(*)::int as n from orders where is_sale" } } as Anthropic.Beta.BetaToolUseBlock] }),
      () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "היו 3 הזמנות.", citations: null } as Anthropic.Beta.BetaTextBlock] }),
    ]);
    const r = await ask(db, "כמה הזמנות היו?", { client, now: NOW });
    expect(r).toEqual({ ok: true, answer: "היו 3 הזמנות.", queries: 1 });
    expect(sent[0].model).toBe("claude-sonnet-5-5");
    expect(sent[0].tools?.[0]).toMatchObject({ name: "run_sql", strict: true });
    const result = (sent[1].messages[2].content as Anthropic.Beta.BetaToolResultBlockParam[])[0];
    expect(result).toMatchObject({ type: "tool_result", tool_use_id: "t1" });
    expect(JSON.parse(String(result.content))).toEqual({ rows: [{ n: 3 }], truncated: false });
  });

  it("a refused query goes back to the model as an error", async () => {
    const { client, sent } = fakeClient([
      () => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "run_sql", input: { sql: "select customer_phone from public.orders" } } as Anthropic.Beta.BetaToolUseBlock] }),
      () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "אין לי גישה לזה.", citations: null } as Anthropic.Beta.BetaTextBlock] }),
    ]);
    await ask(db, "מה הטלפון של דנה?", { client, now: NOW });
    const result = (sent[1].messages[2].content as Anthropic.Beta.BetaToolResultBlockParam[])[0];
    expect(result.is_error).toBe(true);
    expect(String(result.content)).not.toContain("052");
  });

  it("gives up kindly after too many turns, and handles a refusal", async () => {
    const loop = () => ({ stop_reason: "tool_use" as const, content: [{ type: "tool_use", id: "t", name: "run_sql", input: { sql: "select 1" } } as Anthropic.Beta.BetaToolUseBlock] });
    const { client, sent } = fakeClient(Array(8).fill(loop));
    const r = await ask(db, "?", { client, now: NOW });
    expect(r.ok).toBe(false);
    expect(sent).toHaveLength(8);
    expect(sent[7].tool_choice).toEqual({ type: "none" });
    const refused = fakeClient([() => ({ stop_reason: "refusal", content: [] })]);
    expect(await ask(db, "?", { client: refused.client })).toMatchObject({ ok: false, error: "refused" });
  });

  it("the prompt gives today's date and no customer details", () => {
    const p = systemPrompt(NOW);
    expect(p).toContain("2026-11-09");
    expect(p).toContain("is_sale");
  });
});

describe("POST /api/admin/ask/", () => {
  beforeEach(async () => {
    db = await testDb();
  });
  const post = (body: unknown) => POST(new Request("https://www.modubox.com/api/admin/ask/", { method: "POST", body: JSON.stringify(body) }));

  it("only for a signed-in admin who may see orders", async () => {
    session = null;
    expect((await post({ question: "x" })).status).toBe(401);
    session = { user: "seo", role: "content", exp: 9e9 };
    expect((await post({ question: "x" })).status).toBe(401);
  });

  it("without a key, a friendly note", async () => {
    session = { user: "admin", role: "owner", exp: 9e9 };
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await post({ question: "כמה הזמנות?" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: false, error: "no_key" });
    expect((await post({ question: "" })).status).toBe(400);
    vi.unstubAllEnvs();
  });
});
