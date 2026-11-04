import { formatILS } from "./format";
import { paymentMethodLabel, type FullOrder } from "./orders";
import { formatDateTime } from "./admin/time";

/**
 * The email to the business on each paid order, sent with Resend
 * (https://resend.com, free up to 3,000 emails a month). Server code only.
 *
 *   RESEND_API_KEY   the API key from Resend → API Keys
 *   ORDER_EMAIL_TO   who gets it, comma-separated (e.g. sales@modubox.com)
 *   ORDER_EMAIL_FROM optional sender; until a domain is verified in Resend it
 *                    is onboarding@resend.dev, which only sends to the email
 *                    address the Resend account was opened with
 */
export interface EmailConfig {
  apiKey: string;
  to: string[];
  from: string;
}

export function emailConfig(env: Record<string, string | undefined> = process.env): EmailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = (env.ORDER_EMAIL_TO ?? "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^\S+@\S+\.\S+$/.test(s));
  if (!apiKey || to.length === 0) return null;
  return { apiKey, to, from: env.ORDER_EMAIL_FROM?.trim() || "Modubox <onboarding@resend.dev>" };
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The email itself: subject, HTML (Hebrew, right to left) and plain text. */
export function orderEmail({ order: o, items }: FullOrder, adminUrl: string) {
  const ils = (n: number) => formatILS(n, "he");
  const subject = `הזמנה חדשה שולמה: ${o.customerName}, ${ils(o.total)} (#${o.id})`;
  const rows: [string, string][] = [
    ["לקוח", o.customerName],
    ["טלפון", o.customerPhone],
    ["מייל", o.customerEmail ?? ""],
    ["כתובת", [o.address, o.city].filter(Boolean).join(", ")],
    ["הערות הלקוח", o.customerNotes ?? ""],
    ["שולם", `${ils(o.total)}${o.installments > 1 ? ` ב־${o.installments} תשלומים` : ""}`],
    ["קופון", o.couponCode ? `${o.couponCode} (−${ils(o.discount)})` : ""],
    ["לתשלום למתקין ביום ההתקנה", o.payLater ? ils(o.payLater) : ""],
    ["אמצעי תשלום", [paymentMethodLabel(o.paymentMethod), o.card].filter(Boolean).join(" · ")],
    ["אסמכתא Z-Credit", o.zcreditReference ?? ""],
    ["תאריך", formatDateTime(o.paidAt ?? o.createdAt)],
  ];
  const lines = items.map((i) => ({
    title: `${i.productName}${i.qty > 1 ? ` ×${i.qty}` : ""} – ${ils(i.itemsTotal)}`,
    details: [
      ...i.addons.map((a) => `${a.label}${a.qty > 1 ? ` ×${a.qty}` : ""}${a.total === null ? " (מחיר בתיאום)" : ""}`),
      `${i.fulfillmentLabel}${i.fulfillmentPrice ? `: ${ils(i.fulfillmentTotal)}${i.payToInstaller ? " (למתקין)" : ""}` : ""}`,
      ...(i.designLink ? [`עיצוב בקונפיגורטור: ${i.designLink}`] : []),
    ],
  }));

  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#eef3f2;font-family:Arial,Helvetica,sans-serif;color:#0a1517">
<div style="max-width:560px;margin:0 auto;padding:24px 16px" dir="rtl">
<div style="background:#0c3036;color:#fff;border-radius:16px 16px 0 0;padding:20px 24px">
<div style="font-size:13px;color:#5ee3da">Modubox · הזמנה #${esc(o.id)}</div>
<div style="font-size:22px;font-weight:bold;margin-top:4px">הזמנה חדשה שולמה: ${esc(ils(o.total))}</div></div>
<div style="background:#fff;border-radius:0 0 16px 16px;padding:20px 24px">
<table style="width:100%;border-collapse:collapse;font-size:15px">${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#46575b;white-space:nowrap;vertical-align:top;padding-left:12px">${esc(k)}</td><td style="padding:6px 0;font-weight:bold">${esc(v)}</td></tr>`)
    .join("")}</table>
<div style="border-top:1px solid #dbe3e2;margin:16px 0"></div>
${lines
  .map(
    (l) =>
      `<div style="margin-bottom:12px"><div style="font-weight:bold;font-size:15px">${esc(l.title)}</div>${l.details.map((d) => `<div style="font-size:14px;color:#46575b">• ${esc(d)}</div>`).join("")}</div>`,
  )
  .join("")}
${o.partial ? `<p style="color:#925d22;font-size:14px">ההזמנה נשמרה מפרטי התשלום בלבד: פרטי המוצרים חסרים. בדקו ב־Z-Credit.</p>` : ""}
<a href="${esc(adminUrl)}" style="display:block;text-align:center;background:#029f9f;color:#fff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px;border-radius:12px;margin-top:16px">פתיחת ההזמנה בממשק הניהול</a>
</div></div></body></html>`;

  const text = [
    subject,
    "",
    ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    ...lines.flatMap((l) => [l.title, ...l.details.map((d) => `  • ${d}`)]),
    "",
    `בממשק הניהול: ${adminUrl}`,
  ].join("\n");
  return { subject, html, text };
}

/** Sends it with Resend's API. Throws when Resend doesn't take it. */
export async function sendEmail(config: EmailConfig, msg: { subject: string; html: string; text: string; replyTo?: string }, fetcher: typeof fetch = fetch): Promise<void> {
  const res = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to: config.to, subject: msg.subject, html: msg.html, text: msg.text, ...(msg.replyTo ? { reply_to: msg.replyTo } : {}) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
}
