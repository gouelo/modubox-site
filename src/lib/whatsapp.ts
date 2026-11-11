import { dict, type Locale } from "@/i18n";
import { site } from "./catalog";
import { formatILS } from "./format";
import { fulfillmentOptions, type CartLine, type CartSummary, type Quote } from "./pricing";
import type { CartDesign, Product } from "./types";

export function waLink(text: string): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

/** The add-on lines of a quote, then its gift on a line of its own (🎁, with no "free" price after it). */
function quoteLines(q: Quote, locale: Locale): string[] {
  const d = dict(locale);
  const t = d.common;
  const lines = q.lines.slice(1);
  const extras = lines.filter((l) => !l.gift).map((l) => {
    const qty = l.qty > 1 ? ` ×${l.qty}` : "";
    const price = l.total === null ? t.priceOnRequest : l.total === 0 ? t.noExtra : formatILS(l.total, locale);
    return `• ${l.label}${qty} – ${price}`;
  });
  return [...extras, ...lines.filter((l) => l.gift).map((l) => d.whatsapp.gift(l.label))];
}

/** The configuration from the add-ons builder, for "send it to us on WhatsApp" (in the product's language). */
export function configMessage(product: Product, q: Quote): string {
  const locale = product.locale ?? "he";
  const d = dict(locale);
  const t = d.whatsapp.config;
  const out = [t.order(product.name), "", t.base(formatILS(product.price, locale))];
  const extras = quoteLines(q, locale);
  const hasExtras = q.lines.slice(1).some((l) => !l.gift);
  out.push(...(hasExtras ? ["", t.chosen, ...extras] : ["", t.none, ...extras]));
  // delivery & installation: the size's own price (as on the product page), never "by area"
  const f = fulfillmentOptions(product)[0];
  const deliveryLine =
    f.price === null ? t.deliveryOnRequest : f.price === 0 ? t.deliveryIncluded : t.delivery(formatILS(f.price, locale)) + (f.payToInstaller ? d.whatsapp.order.payToInstaller : "");
  out.push("", deliveryLine, t.total(formatILS(q.total + (f.price ?? 0), locale), q.onRequest.length > 0, f.price !== null));
  return out.join("\n");
}

/** A cart item from the 3D configurator: the link to its design, and what is still to agree on. */
export function designLines(d: CartDesign, locale: Locale = "he"): string[] {
  const t = dict(locale).whatsapp;
  return [t.design(d.link), ...(d.exact ? [] : [t.designTodo])];
}

export function productMessage(product: Product): string {
  const locale = product.locale ?? "he";
  const t = dict(locale).whatsapp;
  return [t.product(product.name), t.config.base(formatILS(product.price, locale))].join("\n");
}

export interface Customer {
  name: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  notes?: string;
  /** agreed to get marketing messages (the checkout's checkbox, unchecked by default) */
  marketing?: boolean;
}

/** How a cart line comes to the customer, said plainly: delivery & installation, delivery only, or self pickup. */
function fulfillmentLine(l: CartLine, locale: Locale): string {
  const t = dict(locale).whatsapp.order;
  const ils = (n: number) => formatILS(n, locale);
  const f = l.fulfillment;
  const price = f.price === null ? null : f.price * l.item.qty;
  if (f.id === "pickup") return t.pickup(price ? ils(price) : null);
  if (f.id === "delivery") return t.deliveryOnly(price === null ? dict(locale).common.onRequest : price === 0 ? dict(locale).common.noCost : ils(price));
  if (price === null) return t.deliveryOnRequest;
  if (price === 0) return t.deliveryIncluded;
  return t.deliveryAndInstallation(ils(price)) + (f.payToInstaller ? t.payToInstaller : "");
}

export function orderMessage(cart: CartSummary, customer?: Customer, orderId?: string, locale: Locale = "he"): string {
  const t = dict(locale).whatsapp.order;
  const ils = (n: number) => formatILS(n, locale);
  const out: string[] = [orderId ? t.newOrder(orderId) : t.hello, ""];
  cart.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.product.name}${l.item.qty > 1 ? ` ×${l.item.qty}` : ""} – ${ils(l.itemsTotal)}`);
    out.push(...quoteLines(l.quote, locale).map((s) => `   ${s}`));
    if (l.item.design) out.push(...designLines(l.item.design, locale).map((s) => `   ${s}`));
    out.push(`   ${fulfillmentLine(l, locale)}`);
  });
  const installed = (l: CartLine) => l.fulfillment.id === "deliveryAndInstallation";
  // the total includes delivery & installation only when every line has it, priced and paid online
  const withDelivery = cart.lines.length > 0 && cart.lines.every((l) => installed(l) && l.fulfillment.price !== null && !l.fulfillment.payToInstaller);
  out.push("");
  if (cart.fulfillmentTotal > 0) {
    const allInstalled = cart.lines.filter((l) => l.fulfillmentTotal > 0).every(installed);
    out.push(t.itemsTotal(ils(cart.itemsTotal)), t.fulfillmentTotal(ils(cart.fulfillmentTotal), allInstalled));
  }
  out.push(t.total(ils(cart.total), withDelivery));
  if (cart.payLater) out.push(t.payLater(ils(cart.payLater)));
  if (cart.lines.some((l) => installed(l) && l.fulfillment.price === null)) out.push(t.deliveryNotIncluded);
  if (cart.lines.some((l) => l.quote.onRequest.length > 0)) out.push(t.onRequest);
  if (customer) {
    out.push("", `${t.name}: ${customer.name}`, `${t.phone}: ${customer.phone}`);
    if (customer.email) out.push(`${t.email}: ${customer.email}`);
    out.push(`${t.address}: ${customer.address}, ${customer.city}`);
    if (customer.notes) out.push(`${t.notes}: ${customer.notes}`);
  }
  return out.join("\n");
}
