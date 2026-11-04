import { getDb } from "@/db";
import { checkLead, handleLead, rateLimiter } from "@/lib/leads";

// The site's lead forms (the contact form, an order sent without paying
// online): saves the lead and emails the business (src/lib/leads.ts).
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const allow = rateLimiter();

/** Body: { kind, locale, name, phone, email?, city?, message?, page?, product?, orderId?, attribution?, website (honeypot) }. */
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 20_000) return json({ error: "invalid_request" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const check = checkLead(body);
  if (!check.ok) return json({ error: check.error }, 400);
  // a bot filled in the hidden field: it is told all went well, and nothing is kept
  if ("spam" in check) {
    console.info("[leads] honeypot: dropped");
    return json({ ok: true });
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!allow(ip)) {
    // the customer is offered WhatsApp; the lead stays in the logs
    console.warn("[leads] rate limited", check.lead);
    return json({ error: "rate_limited" }, 429);
  }
  const result = await handleLead(getDb(), check.lead, new URL(req.url).origin);
  if (!result.saved && !result.emailed) return json({ error: "not_delivered" }, 502);
  return json({ ok: true });
}
