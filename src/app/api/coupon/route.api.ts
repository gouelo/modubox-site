import { priceCart } from "@/lib/checkout";
import { parseCoupons } from "@/lib/coupons";

// The coupon preview for the cart and checkout pages: the same server pricing
// as POST /api/checkout, without the payment. The codes are in MODUBOX_COUPONS
// (an env var, never in the repo); with none set, every code is invalid.
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Body: { locale, items, coupon }. Answers { code, discount, total, delivery } or { error, coupon: { error, min } }. */
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 50_000) return json({ error: "invalid_request" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const priced = priceCart(body, { coupons: parseCoupons(process.env.MODUBOX_COUPONS) });
  if (!priced.ok) return json({ error: priced.error, ...(priced.coupon ? { coupon: priced.coupon } : {}) }, 400);
  if (!priced.coupon) return json({ error: "invalid_coupon", coupon: { error: "unknown" } }, 400);
  return json({ code: priced.coupon.code, discount: priced.coupon.amount, delivery: priced.coupon.delivery, total: priced.total });
}
