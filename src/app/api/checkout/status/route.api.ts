import { verifyPayment, verifyReceipt, zcreditConfig } from "@/lib/zcredit";

// The success page asks here whether its order was paid (for the purchase event),
// with the receipt POST /api/checkout gave it. The answer comes from Z-Credit
// (GetSessionStatus), never from the browser: { paid: true } or { paid: false }.
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const config = zcreditConfig();
  if (!config) return json({ paid: false }, 503);
  let body: { order?: unknown; session?: unknown; total?: unknown; sig?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ paid: false }, 400);
  }
  const order = String(body.order ?? "");
  const session = String(body.session ?? "");
  const total = Number(body.total);
  if (!/^\d{1,20}$/.test(order) || !session || session.length > 200 || !Number.isFinite(total) || !verifyReceipt(config.key, order, total, session, String(body.sig ?? ""))) {
    return json({ paid: false }, 400);
  }
  try {
    const result = await verifyPayment(config, session, order, total);
    return json({ paid: result.paid });
  } catch (e) {
    console.error("[checkout] status: GetSessionStatus failed", { order, error: String(e) });
    return json({ paid: false, retry: true }, 502);
  }
}
