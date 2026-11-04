import { dict, type Locale } from "@/i18n";
import { site } from "./catalog";
import { formatILS } from "./format";
import type { CartSummary, Quote } from "./pricing";
import type { CartDesign, Product } from "./types";

export function waLink(text: string): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

function quoteLines(q: Quote, locale: Locale): string[] {
  const t = dict(locale).common;
  return q.lines.slice(1).map((l) => {
    const qty = l.qty > 1 ? ` ×${l.qty}` : "";
    const price = l.total === null ? t.priceOnRequest : l.total === 0 ? t.noExtra : formatILS(l.total, locale);
    return `• ${l.label}${qty} – ${price}`;
  });
}

/** The configuration from the add-ons builder, for "send it to us on WhatsApp" (in the product's language). */
export function configMessage(product: Product, q: Quote): string {
  const locale = product.locale ?? "he";
  const t = dict(locale).whatsapp.config;
  const out = [t.order(product.name), t.base(formatILS(product.price, locale))];
  const extras = quoteLines(q, locale);
  out.push(...(extras.length ? ["", t.chosen, ...extras] : ["", t.none]));
  out.push("", t.total(formatILS(q.total, locale), q.onRequest.length > 0), t.delivery);
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

export function orderMessage(cart: CartSummary, customer?: Customer, orderId?: string, locale: Locale = "he"): string {
  const d = dict(locale);
  const t = d.whatsapp.order;
  const ils = (n: number) => formatILS(n, locale);
  const out: string[] = [orderId ? t.newOrder(orderId) : t.hello, ""];
  cart.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.product.name}${l.item.qty > 1 ? ` ×${l.item.qty}` : ""} – ${ils(l.itemsTotal)}`);
    out.push(...quoteLines(l.quote, locale).map((s) => `   ${s}`));
    if (l.item.design) out.push(...designLines(l.item.design, locale).map((s) => `   ${s}`));
    const fp = l.fulfillment.price;
    out.push(`   🚚 ${l.fulfillment.label}: ${fp === null ? d.common.onRequest : fp === 0 ? d.common.noCost : ils(fp * l.item.qty)}${l.fulfillment.payToInstaller ? t.payToInstaller : ""}`);
  });
  out.push("", t.total(ils(cart.total)));
  if (cart.payLater) out.push(t.payLater(ils(cart.payLater)));
  if (cart.hasOnRequest) out.push(t.onRequest);
  if (customer) {
    out.push("", `${t.name}: ${customer.name}`, `${t.phone}: ${customer.phone}`);
    if (customer.email) out.push(`${t.email}: ${customer.email}`);
    out.push(`${t.address}: ${customer.address}, ${customer.city}`);
    if (customer.notes) out.push(`${t.notes}: ${customer.notes}`);
  }
  return out.join("\n");
}
