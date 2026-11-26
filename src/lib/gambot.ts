import type { NewLead } from "./leads";
import { israeliPhone, waNumber } from "./phone";

/**
 * Every lead from the site's forms also goes to Gambot's webhook (the call
 * tracking service), in addition to the save and the email in leads.ts. The
 * webhook URL carries a secret token, so it comes from the environment
 * (GAMBOT_LEAD_WEBHOOK_URL), never from the code. Unset = nothing is sent.
 * It never fails the lead: a slow or refused webhook is logged and goes on.
 */
export const GAMBOT_TIMEOUT_MS = 4000;

/** The lead as Gambot takes it: the phone in its local form and as +972, the attribution flat. */
export function gambotPayload(lead: NewLead, createdAt: Date) {
  const a = lead.attribution;
  return {
    name: lead.name,
    phone: israeliPhone(lead.phone) ?? `+${waNumber(lead.phone)}`,
    phone_intl: `+${waNumber(lead.phone)}`,
    email: lead.email,
    city: lead.city,
    message: lead.message,
    kind: lead.kind,
    page: lead.page,
    product: lead.product,
    order_id: lead.orderId,
    utm_source: a.utm_source ?? null,
    utm_medium: a.utm_medium ?? null,
    utm_campaign: a.utm_campaign ?? null,
    utm_term: a.utm_term ?? null,
    utm_content: a.utm_content ?? null,
    gclid: a.gclid ?? null,
    fbclid: a.fbclid ?? null,
    created_at: createdAt.toISOString(),
  };
}

/** Posts the lead to the webhook; resolves true when it answered 2xx. Never throws. */
export async function sendLeadToGambot(
  lead: NewLead,
  createdAt: Date,
  url: string | undefined = process.env.GAMBOT_LEAD_WEBHOOK_URL?.trim(),
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!url) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GAMBOT_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(gambotPayload(lead, createdAt)),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[leads] Gambot webhook refused the lead", { status: res.status });
      return false;
    }
    return true;
  } catch (e) {
    // the error text never includes the URL's token: only the name and the message
    console.error("[leads] Gambot webhook failed", { error: String(e) });
    return false;
  } finally {
    clearTimeout(timer);
  }
}
