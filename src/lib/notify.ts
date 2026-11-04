import { site } from "./catalog";
import { he } from "@/i18n/he";
import { formatILS } from "./format";
import { paymentMethodLabel, type FullOrder } from "./orders";
import { formatDateTime } from "./admin/time";

/**
 * The email to the business on each paid order, sent with Resend
 * (https://resend.com, free up to 3,000 emails a month). Server code only.
 *
 *   RESEND_API_KEY   the API key from Resend → API Keys
 *   ORDER_EMAIL_TO   who gets it, comma-separated (e.g. sales@modubox.com)
 *   MAIL_FROM        the sender, on a domain verified in Resend, e.g.
 *                    "Modubox <orders@send.modubox.com>" (ORDER_EMAIL_FROM,
 *                    the older name, still works). Until it is set the sender
 *                    is onboarding@resend.dev, which only sends to the email
 *                    address the Resend account was opened with, so the
 *                    customer's confirmation is skipped without it.
 *   MAIL_REPLY_TO    optional: where the customer's replies go (default: the
 *                    first ORDER_EMAIL_TO)
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
  return { apiKey, to, from: env.MAIL_FROM?.trim() || env.ORDER_EMAIL_FROM?.trim() || "Modubox <onboarding@resend.dev>" };
}

const isEmail = (s: string | null | undefined): s is string => !!s && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(s.trim());

/**
 * The confirmation to the customer, or why it can't go: it needs MAIL_FROM
 * (a verified domain: Resend refuses other recipients without one) and an
 * email address on the order.
 */
export function customerEmailConfig(
  { order: o }: FullOrder,
  env: Record<string, string | undefined> = process.env,
): { ok: true; config: EmailConfig; replyTo?: string } | { ok: false; reason: string } {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.MAIL_FROM?.trim();
  if (!apiKey) return { ok: false, reason: "no RESEND_API_KEY" };
  if (!from) return { ok: false, reason: "no MAIL_FROM (no verified domain in Resend yet)" };
  if (!isEmail(o.customerEmail)) return { ok: false, reason: "no customer email" };
  if (o.partial) return { ok: false, reason: "partial order (no cart details)" };
  const replyTo = [env.MAIL_REPLY_TO, ...(env.ORDER_EMAIL_TO ?? "").split(/[,;\s]+/)].map((s) => s?.trim()).find(isEmail);
  return { ok: true, config: { apiKey, from, to: [o.customerEmail.trim()] }, replyTo };
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

/** "054-1234567" → "tel:+972541234567" */
const tel = (phone: string) => `tel:+972${phone.replace(/\D/g, "").replace(/^0/, "")}`;

/**
 * The confirmation email to the customer once the order is paid: Hebrew,
 * right to left, with the logo, what they bought, and what happens next (the
 * same steps as /checkout/success, he.payment.next).
 */
export function customerOrderEmail({ order: o, items }: FullOrder, origin: string) {
  const ils = (n: number) => formatILS(n, "he");
  const host = origin.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const logo = `${origin}/brand/logo-white-email.png`;
  const whatsapp = `0${site.whatsapp.replace(/^972/, "")}`.replace(/^(\d{3})(\d+)$/, "$1-$2");
  const subject = `קיבלנו את ההזמנה שלך, תודה! (הזמנה #${o.id})`;
  const next = he.payment.next;

  const lines = items.map((i) => ({
    title: `${i.productName}${i.qty > 1 ? ` ×${i.qty}` : ""}`,
    price: ils(i.itemsTotal),
    details: [
      ...i.addons.map((a) => `${a.label}${a.qty > 1 ? ` ×${a.qty}` : ""}${a.total === null ? " (מחיר בתיאום)" : ""}`),
      ...(i.designLink ? ["עוצב בקונפיגורטור התלת־ממדי"] : []),
    ],
    fulfillment: `${i.fulfillmentLabel}: ${
      i.fulfillmentPrice === null ? "בתיאום" : i.fulfillmentTotal === 0 ? "כלול" : `${ils(i.fulfillmentTotal)}${i.payToInstaller ? " (לתשלום למתקין ביום ההתקנה)" : ""}`
    }`,
  }));
  const totals: { k: string; v: string; strong?: boolean }[] = [
    ...(o.couponCode ? [{ k: `קופון ${o.couponCode}`, v: `−${ils(o.discount)}` }] : []),
    { k: "שולם", v: ils(o.total), strong: true },
    ...(o.installments > 1 ? [{ k: "תשלומים", v: `${o.installments} תשלומים` }] : []),
    ...(o.payLater ? [{ k: "לתשלום למתקין ביום ההתקנה", v: ils(o.payLater) }] : []),
  ];
  const details: [string, string][] = [
    ["שם", o.customerName],
    ["טלפון", o.customerPhone],
    ["מייל", o.customerEmail ?? ""],
    ["כתובת להובלה והתקנה", [o.address, o.city].filter(Boolean).join(", ")],
    ["הערות", o.customerNotes ?? ""],
  ];

  const td = "padding:6px 0;font-size:15px;vertical-align:top";
  const muted = "color:#46575b";
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;background:#eef3f2;font-family:Arial,Helvetica,sans-serif;color:#0a1517">
<div style="max-width:560px;margin:0 auto;padding:24px 16px" dir="rtl">
<div style="background:#0c3036;color:#fff;border-radius:16px 16px 0 0;padding:24px;text-align:right">
<img src="${esc(logo)}" alt="Modubox" width="171" height="32" style="display:block;border:0;height:32px;width:171px">
<div style="font-size:24px;font-weight:bold;margin-top:20px">קיבלנו את ההזמנה שלך, תודה!</div>
<div style="font-size:15px;color:#5ee3da;margin-top:6px">מספר הזמנה: <span dir="ltr">#${esc(o.id)}</span></div></div>
<div style="background:#fff;border-radius:0 0 16px 16px;padding:24px;text-align:right">
<p style="margin:0 0 16px;font-size:16px;line-height:1.6">שלום ${esc(o.customerName)}, התשלום התקבל וההזמנה שלך אצלנו.</p>
<div style="font-weight:bold;font-size:17px;margin-bottom:8px">סיכום ההזמנה</div>
<table role="presentation" style="width:100%;border-collapse:collapse">${lines
    .map(
      (l) => `<tr><td style="${td};font-weight:bold">${esc(l.title)}</td><td style="${td};font-weight:bold;text-align:left;white-space:nowrap">${esc(l.price)}</td></tr>
<tr><td colspan="2" style="padding:0 0 10px;font-size:14px;${muted}">${[...l.details, l.fulfillment].map((d) => `• ${esc(d)}`).join("<br>")}</td></tr>`,
    )
    .join("")}
<tr><td colspan="2" style="border-top:1px solid #dbe3e2;padding:0;height:8px"></td></tr>
${totals
  .map((r) => {
    const big = r.strong ? "font-weight:bold;font-size:17px" : muted;
    return `<tr><td style="${td};${big}">${esc(r.k)}</td><td style="${td};${big};text-align:left;white-space:nowrap">${esc(r.v)}</td></tr>`;
  })
  .join("")}
</table>
<div style="background:#eef3f2;border-radius:12px;padding:16px;margin-top:20px">
<div style="font-weight:bold;font-size:16px;margin-bottom:6px">מה קורה עכשיו?</div>
${next.map((s) => `<div style="font-size:15px;line-height:1.6">✓ ${esc(s)}</div>`).join("")}
</div>
<div style="font-weight:bold;font-size:17px;margin:20px 0 6px">הפרטים שלך</div>
<table role="presentation" style="width:100%;border-collapse:collapse">${details
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="${td};${muted};white-space:nowrap;padding-left:12px">${esc(k)}</td><td style="${td}">${esc(v)}</td></tr>`)
    .join("")}</table>
<div style="border-top:1px solid #dbe3e2;margin:20px 0 14px"></div>
<div style="font-size:15px;line-height:1.8">יש שאלה? נשמח לעזור:<br>
טלפון: <a href="${tel(site.phone)}" style="color:#027a7a;font-weight:bold" dir="ltr">${esc(site.phone)}</a><br>
וואטסאפ: <a href="https://wa.me/${esc(site.whatsapp)}" style="color:#027a7a;font-weight:bold" dir="ltr">${esc(whatsapp)}</a><br>
באתר: <a href="${esc(origin)}/" style="color:#027a7a;font-weight:bold" dir="ltr">${esc(host)}</a></div>
</div>
<p style="text-align:center;font-size:12px;color:#46575b;margin:16px 0 0">מודובוקס · ${esc(site.tagline)}</p>
</div></body></html>`;

  const text = [
    "קיבלנו את ההזמנה שלך, תודה!",
    `מספר הזמנה: #${o.id}`,
    "",
    "סיכום ההזמנה",
    ...lines.flatMap((l) => [`${l.title} – ${l.price}`, ...[...l.details, l.fulfillment].map((d) => `  • ${d}`)]),
    "",
    ...totals.map((r) => `${r.k}: ${r.v}`),
    "",
    "מה קורה עכשיו?",
    ...next.map((s) => `- ${s}`),
    "",
    "הפרטים שלך",
    ...details.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    "יש שאלה? נשמח לעזור:",
    `טלפון: ${site.phone}`,
    `וואטסאפ: ${whatsapp}`,
    `באתר: ${origin}/`,
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
