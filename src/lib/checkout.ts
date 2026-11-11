import type { Locale } from "@/i18n/config";
import { addonsFor, getProduct, plain, site } from "./catalog";
import { applyCoupon, israelToday, type AppliedCoupon, type CouponError, type CouponMap } from "./coupons";
import { CONFIGURATOR_ORIGIN, designToCartItem, parseDesign } from "./configurator";
import { fulfillmentOptions, hasVariantQty, summarizeCart, variantKey, type CartSummary } from "./pricing";
import { PROFILE_ADDON, profileColorOf, profileLine } from "./profile-color";
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
  /** a coupon code, checked on the server */
  coupon?: string;
}

/** The cart part of a request (the coupon preview sends only this). */
export function cartRequest(items: CartItem[], locale: Locale, coupon?: string) {
  return {
    locale,
    ...(coupon ? { coupon } : {}),
    items: items.map((i) => ({
      slug: i.slug,
      qty: i.qty,
      selections: i.selections,
      fulfillment: i.fulfillment,
      ...(i.design ? { design: { link: i.design.link, exact: i.design.exact } } : {}),
    })),
  };
}

/** The checkout request for a cart (built in the browser). */
export function checkoutRequest(items: CartItem[], customer: Customer, installments: number, locale: Locale, coupon?: string): CheckoutRequest {
  return { ...cartRequest(items, locale, coupon), customer, installments };
}

export type CheckoutError =
  | "invalid_request"
  | "invalid_customer"
  | "unknown_product"
  | "empty_cart"
  /** something in the cart is priced by a representative: it can't be paid online */
  | "price_on_request"
  /** the coupon code is unknown, expired, or the order is below its minimum */
  | "invalid_coupon";

type Failed = { ok: false; error: CheckoutError; coupon?: { error: CouponError; min?: number } };
export type PricedCart = { ok: true; locale: Locale; cart: CartSummary; coupon: AppliedCoupon | null; total: number } | Failed;
export type Priced = { ok: true; order: PricedOrder } | Failed;

export interface PricedOrder {
  locale: Locale;
  customer: Customer;
  installments: number;
  /** set: the customer picks 1 to this many installments on Z-Credit's page (a payment link from the admin); `installments` is then 1 */
  installmentsUpTo?: number;
  cart: CartSummary;
  /** the coupon applied, with its discount in whole shekels */
  coupon: AppliedCoupon | null;
  /** the amount to charge, in whole shekels (after the coupon) */
  total: number;
}

export interface PriceOptions {
  /** the valid coupons (MODUBOX_COUPONS); none: every code is invalid */
  coupons?: CouponMap;
  /** YYYY-MM-DD in Israel, for coupon expiry */
  today?: string;
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
    marketing: x.marketing === true,
  };
  if (c.name.length < 2 || !validPhone(c.phone, locale) || !c.city || !c.address) return null;
  if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) return null;
  return c;
}

/**
 * The builder's choices, kept to what the product offers: a toggle is 0 or 1,
 * a count is a whole number up to its maximum, a choice one of its choices.
 * Anything else is dropped (a negative count must never lower the price).
 * A choice missing takes its default, except the profiles' colour: the order
 * says only a colour the customer picked (src/lib/profile-color.ts).
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
      else if (fallback && a.id !== PROFILE_ADDON) out[a.id] = fallback;
      // an option by the unit (variantKey): only a real, priced option, up to the add-on's limit
      if (hasVariantQty(a))
        for (const c of a.choices ?? []) {
          const n = int(input[variantKey(a, c.id)]);
          if (c.id !== a.default && n > 0) out[variantKey(a, c.id)] = Math.min(n, a.maxQty ?? MAX_QTY);
        }
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
export function priceCheckout(body: unknown, options: PriceOptions = {}): Priced {
  if (!isObj(body)) return { ok: false, error: "invalid_request" };
  const priced = priceCart(body, options);
  if (!priced.ok) return priced;
  const customer = readCustomer(body.customer, priced.locale);
  if (!customer) return { ok: false, error: "invalid_customer" };
  const n = int(body.installments);
  const installments = n >= 1 && n <= MAX_INSTALLMENTS ? n : 1;
  return { ok: true, order: { locale: priced.locale, customer, installments, cart: priced.cart, coupon: priced.coupon, total: priced.total } };
}

/** The cart and coupon of a request, priced on the server (the checkout, and the coupon preview). */
export function priceCart(body: unknown, { coupons = new Map(), today = israelToday() }: PriceOptions = {}): PricedCart {
  if (!isObj(body) || !Array.isArray(body.items)) return { ok: false, error: "invalid_request" };
  const locale: Locale = body.locale === "en" ? "en" : "he";
  if (body.items.length === 0) return { ok: false, error: "empty_cart" };
  if (body.items.length > MAX_ITEMS) return { ok: false, error: "invalid_request" };

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

  const cart = summarizeCart(items, locale, today);
  if (cart.lines.length === 0) return { ok: false, error: "empty_cart" };
  if (cart.hasOnRequest) return { ok: false, error: "price_on_request" };
  if (!(cart.total > 0)) return { ok: false, error: "empty_cart" };

  let coupon: AppliedCoupon | null = null;
  const code = str(body.coupon, 40);
  if (code) {
    const r = applyCoupon(code, coupons, cart, today);
    if (!r.ok) return { ok: false, error: "invalid_coupon", coupon: { error: r.error, ...(r.min ? { min: r.min } : {}) } };
    coupon = r.coupon;
  }
  return { ok: true, locale, cart, coupon, total: cart.total - (coupon?.amount ?? 0) };
}

/** A Z-Credit cart line (CartItems in CreateSession). Amount is per unit. */
export interface PaymentItem {
  /** ours only (not sent): a delivery and installation line */
  isDelivery?: boolean;
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
    // the profile colour and the promotion's gift first, so the factory sees them even if the description is cut short
    const rest = l.quote.lines.slice(1).filter((x) => x.id !== PROFILE_ADDON);
    const color = profileColorOf(l.product, l.item.selections);
    const extras = [
      ...(color ? [profileLine(color, order.locale)] : []),
      ...[...rest.filter((x) => x.gift), ...rest.filter((x) => !x.gift)].map((x) => plain(x.label) + (x.qty > 1 ? ` ×${x.qty}` : "")),
    ];
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
        isDelivery: true,
      });
    }
  }
  // isDelivery is ours: never sent to Z-Credit
  const items = (order.coupon?.amount ? discounted(out, order) : out).map(({ isDelivery: _, ...x }) => x);
  const sum = items.reduce((s, x) => s + x.Amount * x.Quantity, 0);
  if (sum !== order.total) throw new Error(`payment items add up to ${sum}, not ${order.total}`);
  return items;
}

/**
 * The coupon's discount spread over the lines it covers (the products, or
 * delivery too), in whole shekels, so the cart still adds up to the total.
 * Z-Credit's docs don't allow a negative line, so there is none: a discounted
 * line becomes one line for its whole quantity (×N in its name), at its price
 * less its share, and says so in its description.
 */
function discounted(items: PaymentItem[], order: PricedOrder): PaymentItem[] {
  const coupon = order.coupon!;
  const note = order.locale === "en" ? `incl. coupon ${coupon.code}` : `כולל הנחת קופון ${coupon.code}`;
  const covered = (x: PaymentItem) => coupon.delivery || !x.isDelivery;
  const lines = items.map((x) =>
    covered(x) ? { ...x, Name: x.Quantity > 1 ? `${x.Name} ×${x.Quantity}`.slice(0, 100) : x.Name, Amount: x.Amount * x.Quantity, Quantity: 1 } : x,
  );
  const base = lines.filter(covered).reduce((s, x) => s + x.Amount, 0);
  let left = coupon.amount;
  const shares = lines.map((x) => (covered(x) && base > 0 ? Math.floor((coupon.amount * x.Amount) / base) : 0));
  left -= shares.reduce((s, n) => s + n, 0);
  // the rounding remainder goes to the biggest covered line
  const biggest = lines.reduce((b, x, i) => (covered(x) && (b < 0 || x.Amount > lines[b].Amount) ? i : b), -1);
  if (biggest >= 0) shares[biggest] += left;
  return lines.map((x, i) =>
    shares[i] > 0 ? { ...x, Amount: x.Amount - shares[i], Description: [x.Description, note].filter(Boolean).join(" · ").slice(0, 250) } : x,
  );
}

/** An order number: the date and six random digits, letters and digits only (Z-Credit's UniqueId), e.g. 261104482913. */
export function newOrderId(now = new Date(), random = Math.random): string {
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  return date + String(Math.floor(random() * 1e6)).padStart(6, "0");
}
