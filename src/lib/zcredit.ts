import { createHmac, timingSafeEqual } from "node:crypto";
import { lp } from "@/i18n/config";
import { paymentItems, type PricedOrder } from "./checkout";
import imageLoader from "./image-loader";
import type { Product } from "./types";

/**
 * Z-Credit WebCheckout (the hosted payment page). Server code only (it holds
 * the key): imported by the API routes, never by a page.
 *
 *   1. POST /api/checkout prices the cart from data/ and calls CreateSession;
 *      the browser goes to the SessionUrl it answers (card, Apple Pay, Google Pay).
 *   2. Z-Credit redirects the customer to SuccessUrl (or CancelUrl), and posts
 *      the transaction to CallbackUrl, server to server.
 *   3. The callback asks Z-Credit itself (GetSessionStatus) before it treats
 *      the order as paid: a post to the callback proves nothing by itself.
 *
 * No database: the order number and the amount to charge travel in the
 * callback's address, signed with the WebCheckout key, so the callback knows
 * what it should have been paid without trusting the post.
 *
 * Docs: Z-Credit's WebCheckout API (CreateSession, GetSessionStatus, the
 * callback post data), the same API Shva publishes as "Arena Checkout API":
 * https://developer.shva.co.il/docs/shva-arena-dev-checkout-product/1/overview
 */

export const ZCREDIT_API = "https://pci.zcredit.co.il/webcheckout/api/WebCheckout";

export interface ZCreditConfig {
  key: string;
  terminal: string;
}

/** The terminal's settings from the environment; null when payments aren't set up (the site then offers WhatsApp). */
export function zcreditConfig(env: Record<string, string | undefined> = process.env): ZCreditConfig | null {
  const key = env.ZCREDIT_WEBCHECKOUT_KEY?.trim();
  const terminal = env.ZCREDIT_TERMINAL_NUMBER?.trim();
  return key && terminal ? { key, terminal } : null;
}

/** The signature on an order number and amount, so the callback can trust them. */
export function signOrder(key: string, order: string, total: number): string {
  return createHmac("sha256", key).update(`${order}:${total}`).digest("hex").slice(0, 32);
}

export function verifyOrder(key: string, order: string, total: number, sig: string): boolean {
  const want = Buffer.from(signOrder(key, order, total));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The CreateSession request body (POST {ZCREDIT_API}/CreateSession). */
export interface CreateSessionRequest {
  Key: string;
  TerminalNumber: string;
  Local: "He" | "En";
  UniqueId: string;
  SuccessUrl: string;
  CancelUrl: string;
  CallbackUrl: string;
  PaymentType: "regular";
  CreateInvoice: boolean;
  AdditionalText: string;
  ShowCart: boolean;
  ThemeColor: string;
  /** all the methods the terminal has (card, Apple Pay, Google Pay); never CreditCardOnly */
  FocusType: "None";
  ApplePayButtonEnabled: boolean;
  GooglePayButtonEnabled: boolean;
  ShowTotalSumInPayButton: boolean;
  Installments: { Type: "none" | "regular"; MinQuantity: number; MaxQuantity: number };
  Customer: { Name: string; PhoneNumber: string; Email: string };
  CartItems: ReturnType<typeof paymentItems>;
}

/** Where Z-Credit sends the customer and the callback, on the site the request came from. */
export function returnUrls(origin: string, order: PricedOrder, orderId: string, sig: string) {
  const page = (path: string) => `${origin}${lp(order.locale, path)}`;
  const q = new URLSearchParams({ order: orderId });
  return {
    SuccessUrl: `${page("/checkout/success/")}?${q}`,
    CancelUrl: `${page("/checkout/failed/")}?${q}&reason=cancel`,
    // trailing slash: the site redirects /x to /x/, and a redirected post may be lost
    CallbackUrl: `${origin}/api/checkout/callback/?${new URLSearchParams({ order: orderId, total: String(order.total), sig })}`,
  };
}

/**
 * The CreateSession body for a priced order. Regular payments only: one
 * payment is "none"; more are "regular" installments of exactly the number the
 * customer chose (never "credit"). Apple Pay and Google Pay stay on.
 */
export function buildCreateSession(config: ZCreditConfig, order: PricedOrder, orderId: string, origin: string): CreateSessionRequest {
  const c = order.customer;
  const n = order.installments;
  const https = origin.startsWith("https://");
  // product photos in Z-Credit's cart, which shows only https images
  const image = (p: Product) => (https && p.images[0] ? origin + imageLoader({ src: p.images[0], width: 480 }) : undefined);
  const coupon = order.coupon ? `coupon ${order.coupon.code} -${order.coupon.amount}` : "";
  const note = [`#${orderId}`, c.name, c.phone, `${c.address}, ${c.city}`, coupon, c.notes].filter(Boolean).join(" | ");
  return {
    Key: config.key,
    TerminalNumber: config.terminal,
    Local: order.locale === "en" ? "En" : "He",
    UniqueId: orderId,
    ...returnUrls(origin, order, orderId, signOrder(config.key, orderId, order.total)),
    PaymentType: "regular",
    CreateInvoice: false,
    AdditionalText: note.slice(0, 250),
    ShowCart: true,
    ThemeColor: "029f9f",
    FocusType: "None",
    ApplePayButtonEnabled: true,
    GooglePayButtonEnabled: true,
    ShowTotalSumInPayButton: true,
    Installments: n > 1 ? { Type: "regular", MinQuantity: n, MaxQuantity: n } : { Type: "none", MinQuantity: 1, MaxQuantity: 1 },
    Customer: { Name: c.name, PhoneNumber: c.phone, Email: c.email ?? "" },
    CartItems: paymentItems(order, image),
  };
}

/** Z-Credit answers some calls inside { HasError, Data: {…} } and some flat. */
function unwrap(json: unknown): Record<string, unknown> {
  const o = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  return o.Data && typeof o.Data === "object" ? (o.Data as Record<string, unknown>) : o;
}

async function post(endpoint: string, body: unknown, fetcher: typeof fetch): Promise<Record<string, unknown>> {
  const res = await fetcher(`${ZCREDIT_API}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Z-Credit ${endpoint}: HTTP ${res.status}`);
  return unwrap(await res.json());
}

export type SessionResult = { ok: true; sessionId: string; url: string } | { ok: false; code: unknown; message: string };

export async function createSession(request: CreateSessionRequest, fetcher: typeof fetch = fetch): Promise<SessionResult> {
  const d = await post("CreateSession", request, fetcher);
  const url = typeof d.SessionUrl === "string" ? d.SessionUrl : "";
  if (d.HasError === true || !url.startsWith("https://")) return { ok: false, code: d.ReturnCode, message: String(d.ReturnMessage ?? "") };
  return { ok: true, sessionId: String(d.SessionId ?? ""), url };
}

/** The transaction data Z-Credit posts to the callback (and returns in GetSessionStatus → CallBackJSON). */
export interface CallbackData {
  SessionId?: string;
  ReferenceNumber?: string;
  UniqueID?: string;
  Total?: number | string;
  Currency?: string;
  Installments?: number;
  ApprovalNumber?: string;
  VoucherNumber?: string;
  CardNum?: string;
  CardName?: string;
  CustomerName?: string;
  CustomerPhone?: string;
  CustomerEmail?: string;
  /** 0 = regular charge, 2 = validate (J2), 5 = authorize (J5) */
  J?: number | string;
  /** 0 regular, 1 3DS, 4 Apple Pay, 6 Google Pay */
  PaymentMethod?: number;
  ReturnCode?: number;
}

export type Verification = { paid: true; data: CallbackData } | { paid: false; reason: string };

/**
 * Asks Z-Credit whether a session was paid, and checks that it was paid for
 * this order, in full, as a regular charge.
 */
export async function verifyPayment(config: ZCreditConfig, sessionId: string, order: string, total: number, fetcher: typeof fetch = fetch): Promise<Verification> {
  const s = await post("GetSessionStatus", { Key: config.key, TerminalNumber: config.terminal, SessionId: sessionId }, fetcher);
  return checkSessionStatus(s, order, total);
}

/** GetSessionStatus's answer, checked against the order it should have paid. */
export function checkSessionStatus(s: Record<string, unknown>, order: string, total: number): Verification {
  if (s.HasError === true) return { paid: false, reason: `GetSessionStatus error ${s.ReturnCode}: ${s.ReturnMessage}` };
  if (s.TransactionSuccess !== true) return { paid: false, reason: `not paid (result ${s.TransactionResultCode ?? "?"})` };
  let data: CallbackData = {};
  try {
    data = typeof s.CallBackJSON === "string" && s.CallBackJSON ? JSON.parse(s.CallBackJSON) : {};
  } catch {
    return { paid: false, reason: "CallBackJSON is not JSON" };
  }
  if (data.UniqueID !== undefined && String(data.UniqueID) !== order) return { paid: false, reason: `paid for order ${data.UniqueID}, not ${order}` };
  if (Number(data.Total) !== total) return { paid: false, reason: `paid ${data.Total}, expected ${total}` };
  if (data.J !== undefined && Number(data.J) !== 0) return { paid: false, reason: `not a regular charge (J=${data.J})` };
  return { paid: true, data };
}
