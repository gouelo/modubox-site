import type { Locale } from "@/i18n/config";
import { addonsFor, getProduct, plain, site } from "./catalog";
import { CONFIGURATOR_ORIGIN, designToCartItem, parseDesign } from "./configurator";
import { fulfillmentOptions, summarizeCart, type CartSummary } from "./pricing";
import type { CartItem, DesignExtra, FulfillmentId, Product, Selections } from "./types";
import type { Customer } from "./whatsapp";

/**
 * Online payment: what the checkout page sends to POST /api/checkout, and the
 * server's own pricing of it. The server never trusts a price from the
 * browser: it gets product slugs, the builder's choices and the delivery
 * choice, and prices them again from data/ with the same code as the cart.
 */

/** Regular installments (תשלומים שווים), never credit installments. */
export const MAX_INSTALLMENTS = Math.min(12, site.maxPayments || 1);
const MAX_ITEMS = 20;
const MAX_QTY = 10;

export interface CheckoutRequestItem {
  slug: string;
  qty: number;
  selections: Selections;
  fulfillment: FulfillmentId;
  /** a 3D configurator design: its link is priced again on the server */
  design?: { link: string; exact: boolean };
}

export interface CheckoutRequest {
  locale: Locale;
  items: CheckoutRequestItem[];
  customer: Customer;
  installments: number;
}

/** The checkout request for a cart (built in the browser). */
export function checkoutRequest(items: CartItem[], customer: Customer, installments: number, locale: Locale): CheckoutRequest {
  return {
    locale,
    items: items.map((i) => ({
      slug: i.slug,
      qty: i.qty,
      selections: i.selections,
      fulfillment: i.fulfillment,
      ...(i.design ? { design: { link: i.design.link, exact: i.design.exact } } : {}),
    })),
    customer,
    installments,
  };
}

export type CheckoutError =
  | "invalid_request"
  | "invalid_customer"
  | "unknown_product"
  | "empty_cart"
  /** something in the cart is priced by a representative: it can't be paid online */
  | "price_on_request";

export type Priced = { ok: true; order: PricedOrder } | { ok: false; error: CheckoutError };

export interface PricedOrder {
  locale: Locale;
  customer: Customer;
  installments: number;
  cart: CartSummary;
  /** the amount to charge, in whole shekels */
  total: number;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const str = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const int = (x: unknown) => (typeof x === "number" && Number.isInteger(x) ? x : NaN);

/** An Israeli phone number; on the English site also one from abroad (+44…). The checkout form's own rule. */
export function validPhone(phone: string, locale: Locale): boolean {
  const p = phone.replace(/[\s()-]/g, "");
  return /^0\d{1,2}\d{7}$/.test(p.replace(/^\+?972/, "0")) || (locale === "en" && /^\+\d{8,15}$/.test(p));
}

function readCustomer(x: unknown, locale: Locale): Customer | null {
  if (!isObj(x)) return null;
  const c: Customer = {
    name: str(x.name, 80),
    phone: str(x.phone, 20),
    email: str(x.email, 120),
    city: str(x.city, 60),
    address: str(x.address, 120),
    notes: str(x.notes, 500),
  };
  if (c.name.length < 2 || !validPhone(c.phone, locale) || !c.city || !c.address) return null;
  if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) return null;
  return c;
}

/**
 * The builder's choices, kept to what the product offers: a toggle is 0 or 1,
 * a count is a whole number up to its maximum, a choice one of its choices.
 * Anything else is dropped (a negative count must never lower the price).
 */
export function cleanSelections(product: Product, raw: unknown): Selections {
  const input = isObj(raw) ? raw : {};
  const out: Selections = {};
  for (const a of addonsFor(product)) {
    const v = input[a.id];
    if (a.kind === "choice") {
      const choice = a.choices?.find((c) => c.id === v);
      const fallback = a.default ?? a.choices?.[0]?.id;
      if (choice) out[a.id] = choice.id;
      else if (fallback) out[a.id] = fallback;
    } else if (a.kind === "toggle") {
      if (v === 1) out[a.id] = 1;
    } else {
      const n = int(v);
      const max = a.maxQty ?? MAX_QTY;
      if (n > 0) out[a.id] = Math.min(n, max);
    }
  }
  return out;
}

/** A configurator design's extra lines, from its link (on the configurator's own origin) and not from the browser. */
function designExtras(product: Product, link: string, locale: Locale): DesignExtra[] | undefined {
  try {
    if (!CONFIGURATOR_ORIGIN || new URL(link).origin !== CONFIGURATOR_ORIGIN) return undefined;
  } catch {
    return undefined;
  }
  const item = designToCartItem(parseDesign(link), link, locale);
  return item && item.product.slug === product.slug ? item.design.extras : undefined;
}

/** Reads the browser's checkout request and prices it on the server, from data/. */
export function priceCheckout(body: unknown): Priced {
  if (!isObj(body) || !Array.isArray(body.items)) return { ok: false, error: "invalid_request" };
  const locale: Locale = body.locale === "en" ? "en" : "he";
  if (body.items.length === 0) return { ok: false, error: "empty_cart" };
  if (body.items.length > MAX_ITEMS) return { ok: false, error: "invalid_request" };

  const customer = readCustomer(body.customer, locale);
  if (!customer) return { ok: false, error: "invalid_customer" };

  const n = int(body.installments);
  const installments = n >= 1 && n <= MAX_INSTALLMENTS ? n : 1;

  const items: CartItem[] = [];
  for (const [i, raw] of body.items.entries()) {
    if (!isObj(raw) || typeof raw.slug !== "string") return { ok: false, error: "invalid_request" };
    const product = getProduct(raw.slug, locale);
    if (!product) return { ok: false, error: "unknown_product" };
    const qty = int(raw.qty);
    if (!(qty >= 1 && qty <= MAX_QTY)) return { ok: false, error: "invalid_request" };
    const options = fulfillmentOptions(product);
    const fulfillment = options.find((o) => o.id === raw.fulfillment)?.id ?? options[0].id;

    const item: CartItem = { id: String(i), slug: product.slug, qty, selections: cleanSelections(product, raw.selections), fulfillment };
    const d = raw.design;
    if (isObj(d) && typeof d.link === "string") {
      const exact = d.exact === true;
      const extras = exact ? designExtras(product, d.link, locale) : undefined;
      item.design = { source: "configurator", link: d.link.slice(0, 500), exact: exact && !!extras, ...(extras ? { extras } : {}) };
    }
    items.push(item);
  }

  const cart = summarizeCart(items, locale);
  if (cart.lines.length === 0) return { ok: false, error: "empty_cart" };
  if (cart.hasOnRequest) return { ok: false, error: "price_on_request" };
  if (!(cart.total > 0)) return { ok: false, error: "empty_cart" };
  return { ok: true, order: { locale, customer, installments, cart, total: cart.total } };
}

/** A Z-Credit cart line (CartItems in CreateSession). Amount is per unit. */
export interface PaymentItem {
  Amount: number;
  Currency: "ILS";
  Name: string;
  Description: string;
  Quantity: number;
  IsTaxFree: false;
  Image?: string;
}

/**
 * The order as Z-Credit cart lines: each product with its add-ons, and its
 * delivery and installation when it is charged online. The lines add up to the
 * total exactly (Z-Credit charges the sum of the cart).
 */
export function paymentItems(order: PricedOrder, imageUrl?: (product: Product) => string | undefined): PaymentItem[] {
  const out: PaymentItem[] = [];
  for (const l of order.cart.lines) {
    const name = plain(l.product.name);
    const extras = l.quote.lines.slice(1).map((x) => plain(x.label) + (x.qty > 1 ? ` ×${x.qty}` : ""));
    const image = imageUrl?.(l.product);
    out.push({
      Amount: l.quote.total,
      Currency: "ILS",
      Name: name.slice(0, 100),
      Description: extras.join(", ").slice(0, 250),
      Quantity: l.item.qty,
      IsTaxFree: false,
      ...(image ? { Image: image } : {}),
    });
    if (l.fulfillmentTotal > 0) {
      out.push({
        Amount: l.fulfillment.price ?? 0,
        Currency: "ILS",
        Name: `${plain(l.fulfillment.label)} – ${name}`.slice(0, 100),
        Description: "",
        Quantity: l.item.qty,
        IsTaxFree: false,
      });
    }
  }
  const sum = out.reduce((s, x) => s + x.Amount * x.Quantity, 0);
  if (sum !== order.total) throw new Error(`payment items add up to ${sum}, not ${order.total}`);
  return out;
}

/** An order number: the date and six random digits, letters and digits only (Z-Credit's UniqueId), e.g. 261104482913. */
export function newOrderId(now = new Date(), random = Math.random): string {
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  return date + String(Math.floor(random() * 1e6)).padStart(6, "0");
}
