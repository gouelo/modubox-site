import Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { israelDate } from "./time";

/**
 * The AI question box on the "נתונים" page (/admin/stats): a question in
 * Hebrew ("כמה מחסנים 3×2 נמכרו בחודשיים האחרונים?"), answered by Claude,
 * which may read the shop's numbers through one tool, run_sql.
 *
 * The tool can only read: each query runs in a READ ONLY transaction, with a
 * statement timeout and a row cap, and sees only the views in the `ai_read`
 * schema (drizzle/0010_ai_read_views.sql): orders, their items and add-ons,
 * leads and visits, with no test orders and no customer's name, phone,
 * email, address or message. Server code only.
 *
 * Needs ANTHROPIC_API_KEY in Vercel's environment; without it the box says so.
 */

export const ASK_MODEL = "claude-sonnet-5-5";
/** model calls per question (each may run a query) */
const MAX_TURNS = 8;
export const ROW_CAP = 200;
const TIMEOUT_MS = 5000;
/** a query's answer, as JSON, cut to this length for the model */
const RESULT_CHARS = 30_000;

export function askEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return !!env.ANTHROPIC_API_KEY?.trim();
}

/** Words a question's SQL may not hold: other schemas, the catalog, and functions that run SQL text or touch files. */
const FORBIDDEN = /\b(public|pg_\w*|information_schema|drizzle|current_setting|set_config|dblink\w*|lo_\w+|\w*_to_xml\w*|xml\w*|query_to\w*|txid\w*|copy|into)\b|\bu&|["']?\$\w*\$/i;

/** One read-only SELECT (or WITH … SELECT), or why not. */
export function checkSql(input: unknown): { ok: true; sql: string } | { ok: false; error: string } {
  if (typeof input !== "string" || !input.trim()) return { ok: false, error: "empty query" };
  const q = input.trim().replace(/;\s*$/, "");
  if (q.length > 4000) return { ok: false, error: "query too long" };
  if (q.includes(";")) return { ok: false, error: "one statement only, no semicolons" };
  if (q.includes("--") || q.includes("/*")) return { ok: false, error: "no comments" };
  if (!/^(select|with)\b/i.test(q)) return { ok: false, error: "only SELECT or WITH … SELECT" };
  const bad = q.match(FORBIDDEN);
  if (bad) return { ok: false, error: `not allowed: ${bad[0]}. Use only the tables orders, order_items, order_item_addons, leads, visits` };
  return { ok: true, sql: q };
}

export type SqlResult = { ok: true; rows: Record<string, unknown>[]; truncated: boolean } | { ok: false; error: string };

/** Runs a checked query: READ ONLY, the ai_read views only, a timeout and a row cap. Never throws. */
export async function runReadOnly(db: Db, input: unknown): Promise<SqlResult> {
  const check = checkSql(input);
  if (!check.ok) return check;
  try {
    const rows = await db.transaction(
      async (tx) => {
        await tx.execute(sql.raw(`set local statement_timeout = ${TIMEOUT_MS}`));
        await tx.execute(sql.raw(`set local search_path = ai_read`));
        const res = await tx.execute(sql.raw(`select * from (${check.sql}) as q limit ${ROW_CAP + 1}`));
        return (res as unknown as { rows: Record<string, unknown>[] }).rows;
      },
      { accessMode: "read only" },
    );
    return { ok: true, rows: rows.slice(0, ROW_CAP), truncated: rows.length > ROW_CAP };
  } catch (e) {
    const err = e as { message?: string; cause?: { message?: string } };
    return { ok: false, error: (err.cause?.message ?? err.message ?? "query failed").slice(0, 300) };
  }
}

const TOOL: Anthropic.Beta.BetaTool = {
  name: "run_sql",
  description:
    "Runs one read-only PostgreSQL SELECT (or WITH … SELECT) on the shop's data and returns the rows as JSON (at most 200). " +
    "Only these tables exist: orders, order_items, order_item_addons, leads, visits. One statement, no semicolons, no comments. " +
    "Aggregate in SQL (count, sum, group by) rather than fetching many rows.",
  input_schema: {
    type: "object",
    properties: { sql: { type: "string", description: "The SELECT query" } },
    required: ["sql"],
    additionalProperties: false,
  },
  strict: true,
};

export function systemPrompt(now = new Date()): string {
  return `You answer questions from the owner of Modubox (מודובוקס), an Israeli company that sells modular garden sheds online (www.modubox.com), about the shop's sales, leads and site visits. The owner is not a marketer: answer in Hebrew, short and clear, in plain text (no Markdown tables or headings; a short list is fine). Amounts are whole shekels: write them like ₪12,500. Today in Israel is ${israelDate(now)} (time zone Asia/Jerusalem).

Use the run_sql tool to get the numbers; never guess a number. If the data can't answer the question, say so plainly. Say which period you counted when it isn't obvious. Don't show SQL to the owner.

Tables (PostgreSQL views; test orders are already excluded):
- orders: id, created_at (timestamptz), created_day (date, Israel), paid_at, paid_day (date, Israel), status ('pending_payment' = started paying and didn't finish, 'new' = a live order, 'cancelled'), is_sale (boolean: paid and not cancelled. A "sale"/"order"/"מכירה"/"הזמנה" means is_sale = true, dated by paid_day, unless asked otherwise), locale ('he'/'en'), city, items_total (products + add-ons), fulfillment_total (delivery/installation charged online), pay_later (delivery/installation paid to the installer), coupon_code, discount, total (charged), installments, source (null = the site's checkout; 'phone'/'whatsapp'/'other' = entered by hand in the admin), payment, partial.
- order_items: id, order_id, product_slug (e.g. 'modubox-3x2'), product_name (Hebrew, e.g. 'מחסן מודובוקס 3×2'), qty, base_price, unit_total, items_total, fulfillment ('pickup'/'delivery'/'deliveryAndInstallation'), fulfillment_label, fulfillment_total. Sizes are width×depth in metres; '3×2', '3x2' and '2×3' may be written differently: match on product_slug or product_name with ILIKE, and check the distinct names first when unsure.
- order_item_addons: order_id, order_item_id, product_slug, label (Hebrew), qty, total, gift (true = a free promotional gift, not a purchase).
- leads: id, created_at, created_day, kind ('contact' = contact form, 'product', 'order' = an order sent without paying online), locale, city, page, product, order_id, status ('new'/'in_progress'/'handled'/'not_relevant'), utm_source, utm_medium, utm_campaign, referrer, from_google_ads, from_facebook_ads.
- visits (counted only since the site's own statistics started, in November 2026; no earlier history): at, day (date, Israel), kind ('pageview'/'whatsapp_click'/'phone_click'), path, referrer_host, utm_source, utm_medium, channel ('google'/'facebook'/'direct'/'other' on a page load from outside; null on moves inside the site and on clicks), device ('mobile'/'desktop'), visitor (an anonymous id that changes every day: unique visitors = count(distinct visitor) per day, summed over days).

There is no customer name, phone or email in these tables, and you must not try to find any.`;
}

export type AskResult = { ok: true; answer: string; queries: number } | { ok: false; error: "no_key" | "auth" | "rate_limited" | "refused" | "failed"; message: string };

const NO_KEY = "כדי שהשאלות יעבדו צריך להגדיר ב־Vercel משתנה סביבה בשם ANTHROPIC_API_KEY (מפתח מ־console.anthropic.com), ואז לפרסם מחדש.";

/** Answers one question; never throws. `client` for the tests. */
export async function ask(db: Db, question: string, opts: { client?: Anthropic; now?: Date; env?: Record<string, string | undefined> } = {}): Promise<AskResult> {
  if (!opts.client && !askEnabled(opts.env)) return { ok: false, error: "no_key", message: NO_KEY };
  const client = opts.client ?? new Anthropic({ apiKey: (opts.env ?? process.env).ANTHROPIC_API_KEY?.trim(), timeout: 45_000, maxRetries: 1 });
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: question }];
  let queries = 0;
  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const last = turn === MAX_TURNS - 1;
      const res = await client.beta.messages.create({
        model: ASK_MODEL,
        max_tokens: 16000,
        system: systemPrompt(opts.now),
        output_config: { effort: "medium" },
        // a declined request is answered again by the fallback model, in the same call
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        // the last turn has to answer with what it has
        tools: [TOOL],
        tool_choice: last ? { type: "none" } : { type: "auto" },
        messages,
      });
      if (res.stop_reason === "refusal") return { ok: false, error: "refused", message: "לא הצלחתי לענות על השאלה הזו. נסו לנסח אותה אחרת." };
      const calls = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (res.stop_reason !== "tool_use" || !calls.length) {
        const answer = res.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return answer ? { ok: true, answer, queries } : { ok: false, error: "failed", message: "לא התקבלה תשובה. נסו שוב." };
      }
      messages.push({ role: "assistant", content: res.content });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const call of calls) {
        queries++;
        const r = call.name === "run_sql" ? await runReadOnly(db, (call.input as { sql?: unknown })?.sql) : ({ ok: false, error: `unknown tool ${call.name}` } as const);
        const content = r.ok ? JSON.stringify({ rows: r.rows, truncated: r.truncated }).slice(0, RESULT_CHARS) : `error: ${r.error}`;
        results.push({ type: "tool_result", tool_use_id: call.id, content, ...(r.ok ? {} : { is_error: true }) });
      }
      messages.push({ role: "user", content: results });
    }
    return { ok: false, error: "failed", message: "השאלה הייתה מורכבת מדי. נסו לשאול אותה בצורה פשוטה יותר." };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      return { ok: false, error: "auth", message: "המפתח ANTHROPIC_API_KEY ב־Vercel לא תקין או בלי הרשאה. כדאי ליצור מפתח חדש ב־console.anthropic.com ולעדכן אותו." };
    }
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "rate_limited", message: "יותר מדי שאלות ברגע. נסו שוב בעוד דקה." };
    console.warn("[ask] failed", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return { ok: false, error: "failed", message: "משהו השתבש. נסו שוב בעוד רגע." };
  }
}
