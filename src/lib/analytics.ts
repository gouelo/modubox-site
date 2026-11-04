import type { Locale } from "@/i18n";
import { summarizeCart, type CartSummary } from "./pricing";
import type { CartItem } from "./types";

/**
 * Google Tag Manager and the events the site pushes to its dataLayer, in GA4's
 * names and shapes, so the ad agency can build tags and conversions in GTM.
 * Never put a person's details (name, phone, email, address) in an event.
 *
 * GTM loads only on the production site: Vercel's production deployment
 * (VERCEL_ENV=production), so previews and GitHub Pages don't count visits.
 * NEXT_PUBLIC_GTM_ID overrides it: another container id, or "off".
 */
export const GTM_ID = "GTM-MB2W45D";

export function gtmId(env: Record<string, string | undefined> = process.env): string {
  const set = env.NEXT_PUBLIC_GTM_ID?.trim();
  if (set) return /^GTM-[A-Z0-9]+$/.test(set) ? set : "";
  return env.VERCEL_ENV === "production" ? GTM_ID : "";
}

export const CURRENCY = "ILS";

export interface GaItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  /** product + add-ons, one unit, in shekels */
  price: number;
  quantity: number;
}

type Event = Record<string, unknown> & { event: string };

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function track(event: Event) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  // GA4 keeps the last ecommerce object: clear it first (Google's recommendation)
  if ("ecommerce" in event) window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(event);
}

export function gaItems(cart: CartSummary): GaItem[] {
  return cart.lines.map((l) => ({
    item_id: l.product.slug,
    item_name: l.product.name,
    item_category: l.product.category,
    price: l.quote.total,
    quantity: l.item.qty,
  }));
}

/** add_to_cart / begin_checkout / purchase's ecommerce object. */
export function ecommerce(cart: CartSummary, extra: Record<string, unknown> = {}) {
  return { currency: CURRENCY, value: cart.total, items: gaItems(cart), ...extra };
}

function pageLocale(): Locale {
  return typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "he";
}

export function trackAddToCart(item: CartItem) {
  const cart = summarizeCart([item], pageLocale());
  if (cart.lines.length) track({ event: "add_to_cart", ecommerce: ecommerce(cart, { value: cart.itemsTotal }) });
}

/** A link a click counts for: WhatsApp or phone. Its address without the query (a WhatsApp text may hold details). */
export function linkEvent(href: string): { event: "whatsapp_click" | "phone_click"; link_url: string } | null {
  if (/^tel:/i.test(href)) return { event: "phone_click", link_url: `tel:${href.slice(4).replace(/[^\d+]/g, "")}` };
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol === "whatsapp:" || /(^|\.)wa\.me$|(^|\.)whatsapp\.com$/i.test(url.hostname)) {
    return { event: "whatsapp_click", link_url: `${url.protocol}//${url.host}${url.pathname}` };
  }
  return null;
}

/**
 * A paid order, waiting for the success page: kept when the customer goes to
 * Z-Credit, so the purchase event has its items. The session id lets the
 * server confirm with Z-Credit that it was paid; sig is the server's.
 */
export interface PendingOrder {
  order: string;
  session: string;
  total: number;
  sig: string;
  coupon?: string;
  items: GaItem[];
}

const PENDING = "modubox-pending-order";
const SENT = (order: string) => `modubox-purchase-${order}`;

export function savePending(p: PendingOrder) {
  try {
    localStorage.setItem(PENDING, JSON.stringify(p));
  } catch {
    /* private mode: no purchase event, the payment still works */
  }
}

export function readPending(order: string): PendingOrder | null {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING) ?? "null") as PendingOrder | null;
    return p && p.order === order ? p : null;
  } catch {
    return null;
  }
}

/** Once per order: sessionStorage for this tab, and the pending order is gone after it. */
export function purchaseSent(order: string): boolean {
  try {
    return sessionStorage.getItem(SENT(order)) === "1";
  } catch {
    return false;
  }
}

export function markPurchaseSent(order: string) {
  try {
    sessionStorage.setItem(SENT(order), "1");
    localStorage.removeItem(PENDING);
  } catch {
    /* ignore */
  }
}
