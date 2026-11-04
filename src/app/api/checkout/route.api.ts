import { newOrderId, priceCheckout, type PricedOrder } from "@/lib/checkout";
import { parseCoupons } from "@/lib/coupons";
import { buildCreateSession, createSession, signReceipt, zcreditConfig } from "@/lib/zcredit";

// Z-Credit checkout: GET says whether online payment is on, POST starts a payment.
// Only on a server build (Vercel); the GitHub Pages export leaves route.api.ts out.
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Whether payment is set up (ZCREDIT_* env vars); the checkout page falls back to WhatsApp when it isn't. */
export function GET() {
  return json({ enabled: zcreditConfig() !== null });
}

/**
 * Body: the cart (product slugs, the builder's choices, delivery choice,
 * optional configurator link), an optional coupon code, the customer and the
 * number of installments.
 * Answers { url } of Z-Credit's payment page, or { error }.
 */
export async function POST(req: Request) {
  const config = zcreditConfig();
  if (!config) return json({ error: "not_configured" }, 503);

  const text = await req.text();
  if (text.length > 50_000) return json({ error: "invalid_request" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  // coupon codes live in the MODUBOX_COUPONS env var, never in the (public) repo
  const priced = priceCheckout(body, { coupons: parseCoupons(process.env.MODUBOX_COUPONS) });
  if (!priced.ok) return json({ error: priced.error, ...(priced.coupon ? { coupon: priced.coupon } : {}) }, 400);
  const order = priced.order;
  const orderId = newOrderId();
  const origin = new URL(req.url).origin;

  const session = await createSession(buildCreateSession(config, order, orderId, origin));
  if (!session.ok) {
    console.error("[checkout] CreateSession failed", JSON.stringify({ orderId, status: session.status, code: session.code, message: session.message, body: session.body }));
    // safe to show: Z-Credit's status and error, never the key or the request
    return json({ error: "payment_unavailable", zcreditError: { status: session.status, ReturnCode: session.code, ReturnMessage: session.message.slice(0, 300) } }, 502);
  }
  // TODO(order notification): no email service yet. Until one is added (e.g. Resend),
  // the order lives in the Vercel logs (Project → Logs) and in Z-Credit's panel
  // (AdditionalText carries the customer and address).
  console.info("[checkout] order created, waiting for payment", JSON.stringify(orderLog(orderId, session.sessionId, order)));
  // the success page's receipt: it asks /api/checkout/status/ with it whether the order was paid
  const receipt = { session: session.sessionId, total: order.total, sig: signReceipt(config.key, orderId, order.total, session.sessionId) };
  return json({ url: session.url, orderId, receipt });
}

function orderLog(orderId: string, sessionId: string, order: PricedOrder) {
  return {
    orderId,
    sessionId,
    total: order.total,
    coupon: order.coupon,
    installments: order.installments,
    payLater: order.cart.payLater,
    customer: order.customer,
    lines: order.cart.lines.map((l) => ({
      product: l.product.slug,
      qty: l.item.qty,
      itemsTotal: l.itemsTotal,
      addons: l.quote.lines.slice(1).map((x) => `${x.label}${x.qty > 1 ? ` ×${x.qty}` : ""}`),
      fulfillment: l.fulfillment.label,
      fulfillmentTotal: l.fulfillmentTotal,
      design: l.item.design?.link,
    })),
  };
}
