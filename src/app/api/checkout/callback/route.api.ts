import { orderPaid } from "@/lib/order-events";
import { verifyOrder, verifyPayment, zcreditConfig, type CallbackData } from "@/lib/zcredit";

// Z-Credit's callback (CallbackUrl): posted server to server after a successful
// payment, retried up to 5 times while we don't answer 200. The post itself is
// not trusted: the order and amount come signed in our own address, and the
// payment is confirmed with Z-Credit (GetSessionStatus) before it counts.
export const dynamic = "force-dynamic";

const text = (body: string, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });

async function readPost(req: Request): Promise<CallbackData> {
  const raw = await req.text();
  try {
    return JSON.parse(raw) as CallbackData;
  } catch {
    return Object.fromEntries(new URLSearchParams(raw)) as CallbackData;
  }
}

export async function POST(req: Request) {
  const config = zcreditConfig();
  if (!config) return text("not configured", 503);

  const q = new URL(req.url).searchParams;
  const order = q.get("order") ?? "";
  const total = Number(q.get("total"));
  if (!order || !Number.isFinite(total) || !verifyOrder(config.key, order, total, q.get("sig") ?? "")) {
    console.warn("[checkout] callback with a bad signature", { order });
    return text("bad signature", 400);
  }

  const post = await readPost(req);
  const sessionId = String(post.SessionId ?? "");
  if (!sessionId) return text("no SessionId", 400);

  let result;
  try {
    result = await verifyPayment(config, sessionId, order, total);
  } catch (e) {
    // Z-Credit unreachable: answer an error, so it posts the callback again later
    console.error("[checkout] GetSessionStatus failed", { order, sessionId, error: String(e) });
    return text("try again", 502);
  }

  if (!result.paid) {
    console.warn("[checkout] callback NOT verified, order not paid", { order, sessionId, reason: result.reason });
    return text("OK");
  }

  const d = result.data;
  console.info(
    "[checkout] ORDER PAID",
    JSON.stringify({
      order,
      sessionId,
      total,
      installments: d.Installments,
      referenceNumber: d.ReferenceNumber,
      approvalNumber: d.ApprovalNumber,
      paymentMethod: d.PaymentMethod,
      card: d.CardName && d.CardNum ? `${d.CardName} ${d.CardNum}` : undefined,
      customer: { name: d.CustomerName, phone: d.CustomerPhone, email: d.CustomerEmail },
    }),
  );
  // the order in the database marked paid, and the email to the business
  try {
    await orderPaid({ orderId: order, total, sessionId, data: d }, new URL(req.url).origin);
  } catch (e) {
    // the database failed: answer an error, so Z-Credit posts the callback again
    console.error("[orders] marking the order paid failed", { order, error: String(e) });
    return text("try again", 502);
  }
  return text("OK");
}
