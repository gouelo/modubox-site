import { site } from "./catalog";
import { formatILS } from "./format";
import type { CartSummary, Quote } from "./pricing";
import type { Product } from "./types";

export function waLink(text: string): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

function quoteLines(q: Quote): string[] {
  return q.lines.slice(1).map((l) => {
    const qty = l.qty > 1 ? ` ×${l.qty}` : "";
    const price = l.total === null ? "מחיר בתיאום" : l.total === 0 ? "ללא תוספת" : formatILS(l.total);
    return `• ${l.label}${qty} – ${price}`;
  });
}

/** The configuration from the add-ons builder, for "send it to us on WhatsApp". */
export function configMessage(product: Product, q: Quote): string {
  const out = [`היי מודובוקס! אשמח להזמין ${product.name}`, `מחיר בסיס: ${formatILS(product.price)}`];
  const extras = quoteLines(q);
  out.push(...(extras.length ? ["", "התוספות שבחרתי:", ...extras] : ["", "ללא תוספות"]));
  out.push("", `סה"כ: ${formatILS(q.total)}${q.onRequest.length ? " + פריטים במחיר בתיאום" : ""}`, "(הובלה והתקנה לפי האזור)");
  return out.join("\n");
}

export function productMessage(product: Product): string {
  return [`היי מודובוקס! אשמח לפרטים על ${product.name}`, `מחיר בסיס: ${formatILS(product.price)}`].join("\n");
}

export interface Customer {
  name: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  notes?: string;
}

export function orderMessage(cart: CartSummary, customer?: Customer, orderId?: string): string {
  const out: string[] = [orderId ? `הזמנה חדשה מהאתר #${orderId}` : "היי מודובוקס! אשמח להזמין:", ""];
  cart.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.product.name}${l.item.qty > 1 ? ` ×${l.item.qty}` : ""} – ${formatILS(l.itemsTotal)}`);
    out.push(...quoteLines(l.quote).map((s) => `   ${s}`));
    const fp = l.fulfillment.price;
    out.push(`   🚚 ${l.fulfillment.label}: ${fp === null ? "בתיאום" : fp === 0 ? "ללא עלות" : formatILS(fp * l.item.qty)}${l.fulfillment.payToInstaller ? " (תשלום למתקין)" : ""}`);
  });
  out.push("", `סה"כ לתשלום: ${formatILS(cart.total)}`);
  if (cart.payLater) out.push(`לתשלום למתקין ביום ההתקנה: ${formatILS(cart.payLater)}`);
  if (cart.hasOnRequest) out.push("* חלק מהפריטים במחיר בתיאום");
  if (customer) {
    out.push("", `שם: ${customer.name}`, `טלפון: ${customer.phone}`);
    if (customer.email) out.push(`אימייל: ${customer.email}`);
    out.push(`כתובת: ${customer.address}, ${customer.city}`);
    if (customer.notes) out.push(`הערות: ${customer.notes}`);
  }
  return out.join("\n");
}
