import type { Order, OrderItem } from "@/db/schema";
import { paymentMethodLabel } from "../orders";
import { consentLabel, sourceLabel, STATUS_LABEL } from "./status";
import { formatDateTime } from "./time";

/**
 * Orders as a CSV file that opens right in Excel and Google Sheets: UTF-8 with
 * a BOM (so Hebrew shows), one order per row.
 */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  // a cell starting with = + - @ would run as a formula in Excel
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADER = [
  "מספר הזמנה",
  "נוצרה",
  "סטטוס",
  "שולמה",
  "לקוח",
  "טלפון",
  "מייל",
  "עיר",
  "כתובת",
  "מוצרים",
  "תוספות",
  "אספקה והתקנה",
  "מוצרים ותוספות (₪)",
  "אספקה והתקנה (₪)",
  "קופון",
  "הנחה (₪)",
  "שולם (₪)",
  "תשלומים",
  "למתקין ביום ההתקנה (₪)",
  "אמצעי תשלום",
  "אסמכתא Z-Credit",
  "מספר אישור",
  "מועד אספקה",
  "הערות הלקוח",
  "מקור",
  "מסכים/ה לדיוור",
  "הזמנת בדיקה",
];

export function ordersCsv(rows: { order: Order; items: OrderItem[] }[]): string {
  const lines = [HEADER.map(csvCell).join(",")];
  for (const { order: o, items } of rows) {
    lines.push(
      [
        o.id,
        formatDateTime(o.createdAt),
        STATUS_LABEL[o.status],
        formatDateTime(o.paidAt),
        o.customerName,
        o.customerPhone,
        o.customerEmail,
        o.city,
        o.address,
        items.map((i) => `${i.productName}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(" | "),
        items.map((i) => i.addons.map((a) => `${a.label}${a.qty > 1 ? ` ×${a.qty}` : ""}`).join(", ")).filter(Boolean).join(" | "),
        items.map((i) => i.fulfillmentLabel).join(" | "),
        o.itemsTotal,
        o.fulfillmentTotal,
        o.couponCode,
        o.discount || "",
        o.total,
        o.paidInstallments ?? o.installments,
        o.payLater || "",
        [paymentMethodLabel(o.paymentMethod), o.card].filter(Boolean).join(" "),
        o.zcreditReference,
        o.approvalNumber,
        o.scheduledFor,
        o.customerNotes,
        sourceLabel(o.source),
        consentLabel(o.marketingConsent),
        o.isTest ? "כן" : "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
