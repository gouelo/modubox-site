import { lp, type Locale } from "@/i18n/config";
import { getProduct, productPath } from "../catalog";

/**
 * The WhatsApp follow-up for a checkout that wasn't paid: a polite message
 * with what they ordered and a link back to it. Opened in WhatsApp by a
 * person, who reads it and sends it; nothing is ever sent automatically.
 */

export interface FollowUpOrder {
  customerName: string;
  customerPhone: string;
  locale: string;
}

/** wa.me wants the number in international form, digits only: 052-1234567 → 972521234567. */
export function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("0") ? `972${d.slice(1)}` : d;
}

export function followUpText(o: FollowUpOrder, product: { slug: string; name: string; more: number } | undefined, origin: string): string {
  const locale: Locale = o.locale === "en" ? "en" : "he";
  const first = o.customerName.trim().split(/\s+/)[0] ?? "";
  const p = product ? getProduct(product.slug, locale) : undefined;
  const url = origin + (p ? lp(locale, productPath(p)) : lp(locale, "/cart/"));
  const name = product ? (product.more ? (locale === "en" ? `${product.name} and more` : `${product.name} ועוד`) : product.name) : "";
  if (locale === "en")
    return [`Hi ${first}, this is Modubox 🙂`, `We saw you started an order${name ? ` for ${name}` : ""} on our site and didn't get to finish the payment. Can we help with anything, or answer a question?`, `To pick up where you left off: ${url}`].join("\n");
  return [`שלום ${first}, כאן מודובוקס 🙂`, `ראינו שהתחלת להזמין${name ? ` ${name}` : ""} באתר ולא הספקת לסיים את התשלום. אפשר לעזור במשהו או לענות על שאלה?`, `להמשך ההזמנה: ${url}`].join("\n");
}

export function followUpLink(o: FollowUpOrder, product: { slug: string; name: string; more: number } | undefined, origin: string): string {
  return `https://wa.me/${waNumber(o.customerPhone)}?text=${encodeURIComponent(followUpText(o, product, origin))}`;
}
