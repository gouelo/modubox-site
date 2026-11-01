import { dict, type Locale } from "@/i18n";
import { addonsFor, getProduct } from "./catalog";
import type { Addon, CartItem, DesignExtra, FulfillmentId, Product, Selections } from "./types";

export interface PriceLine {
  id: string;
  label: string;
  qty: number;
  /** null = price on request */
  unitPrice: number | null;
  total: number | null;
}

export interface Quote {
  lines: PriceLine[];
  /** Sum of all known prices (product + add-ons). */
  total: number;
  /** Add-ons whose price is set by phone. */
  onRequest: PriceLine[];
}

/** Starting selections: every choice at its default, everything else off. */
export function defaultSelections(product: Product): Selections {
  const s: Selections = {};
  for (const a of addonsFor(product)) {
    if (a.kind === "choice") s[a.id] = a.default ?? a.choices?.[0]?.id ?? "";
  }
  return s;
}

function addonLine(a: Addon, value: number | string | undefined, locale: Locale): PriceLine | null {
  if (a.kind === "choice") {
    const choice = a.choices?.find((c) => c.id === value);
    if (!choice || choice.id === a.default) return null;
    const area = a.areaM2 ? dict(locale).pricing.areaSuffix(a.areaM2) : "";
    return { id: a.id, label: `${a.name}: ${choice.label}${area}`, qty: 1, unitPrice: choice.price, total: choice.price };
  }
  const qty = typeof value === "number" ? value : 0;
  if (qty <= 0) return null;
  const unit = a.price ?? null;
  return { id: a.id, label: a.name, qty, unitPrice: unit, total: unit === null ? null : unit * qty };
}

/** The price of a product with the builder's selections, plus any lines the 3D configurator added. */
export function quote(product: Product, selections: Selections, extras: DesignExtra[] = []): Quote {
  const lines: PriceLine[] = [
    { id: "base", label: product.name, qty: 1, unitPrice: product.price, total: product.price },
  ];
  const locale = product.locale ?? "he";
  for (const a of addonsFor(product)) {
    const line = addonLine(a, selections[a.id], locale);
    if (line) lines.push(line);
  }
  for (const x of extras) {
    if (x.qty > 0) lines.push({ id: x.id, label: extraLabel(x, product), qty: x.qty, unitPrice: x.unitPrice, total: x.unitPrice === null ? null : x.unitPrice * x.qty });
  }
  return {
    lines,
    total: lines.reduce((sum, l) => sum + (l.total ?? 0), 0),
    onRequest: lines.filter((l) => l.total === null),
  };
}

/**
 * A configurator line's label in the product's language: the cart keeps the
 * label it was added with, but the ids say what it is (src/lib/configurator.ts),
 * so a cart shared across languages reads right in both.
 */
export function extraLabel(x: DesignExtra, product: Product): string {
  const locale = product.locale ?? "he";
  const t = dict(locale).configurator;
  if (x.id === "cfg-kipp") return t.kipp;
  if (x.id === "cfg-glass-door") return t.glassDoor;
  const [addonId, choiceId] = x.id.replace(/\+$/, "").split("+");
  const a = addonsFor(product).find((y) => y.id === addonId);
  if (!a) return x.label;
  if (!choiceId) return a.name;
  const c = a.choices?.find((y) => y.id === choiceId);
  return c ? `${a.name}: ${c.label}` : x.label;
}

export interface FulfillmentOption {
  id: FulfillmentId;
  label: string;
  /** null = price on request */
  price: number | null;
  note?: string;
  payToInstaller?: boolean;
}

export function fulfillmentOptions(product: Product): FulfillmentOption[] {
  const f = product.fulfillment;
  const t = dict(product.locale ?? "he").pricing;
  const opts: FulfillmentOption[] = [];
  if (f.deliveryAndInstallation !== null) {
    opts.push({
      id: "deliveryAndInstallation",
      label: f.deliveryAndInstallation === 0 ? t.deliveryIncluded : t.delivery,
      price: f.deliveryAndInstallation,
      note: f.note ?? undefined,
      payToInstaller: f.payToInstaller,
    });
  } else if (f.delivery !== null && f.installation !== null) {
    opts.push({
      id: "deliveryAndInstallation",
      label: t.delivery,
      price: f.delivery + f.installation,
      note: f.note ?? undefined,
      payToInstaller: f.payToInstaller,
    });
  }
  if (f.delivery !== null) {
    opts.push({ id: "delivery", label: t.deliveryOnly, price: f.delivery, note: f.deliveryNote });
  }
  if (f.pickup !== null) {
    opts.push({ id: "pickup", label: t.pickup, price: f.pickup, note: f.pickupNote });
  }
  if (opts.length === 0) {
    opts.push({ id: "deliveryAndInstallation", label: t.deliveryOnRequest, price: null, note: f.note ?? undefined });
  }
  return opts;
}

export function defaultFulfillment(product: Product): FulfillmentId {
  return fulfillmentOptions(product)[0].id;
}

export interface CartLine {
  item: CartItem;
  product: Product;
  quote: Quote;
  fulfillment: FulfillmentOption;
  /** product + add-ons, times qty */
  itemsTotal: number;
  /** delivery/installation charged online, times qty */
  fulfillmentTotal: number;
  /** delivery/installation paid to the installer on the day */
  payLater: number;
}

export interface CartSummary {
  lines: CartLine[];
  itemsTotal: number;
  fulfillmentTotal: number;
  payLater: number;
  total: number;
  hasOnRequest: boolean;
  count: number;
}

/** The cart, with names and labels in the page's language (the cart itself is shared by both). */
export function summarizeCart(items: CartItem[], locale: Locale = "he"): CartSummary {
  const lines: CartLine[] = [];
  for (const item of items) {
    const product = getProduct(item.slug, locale);
    if (!product) continue;
    const q = quote(product, item.selections, item.design?.extras);
    const options = fulfillmentOptions(product);
    const f = options.find((o) => o.id === item.fulfillment) ?? options[0];
    const fPrice = (f.price ?? 0) * item.qty;
    lines.push({
      item,
      product,
      quote: q,
      fulfillment: f,
      itemsTotal: q.total * item.qty,
      fulfillmentTotal: f.payToInstaller ? 0 : fPrice,
      payLater: f.payToInstaller ? fPrice : 0,
    });
  }
  const itemsTotal = lines.reduce((s, l) => s + l.itemsTotal, 0);
  const fulfillmentTotal = lines.reduce((s, l) => s + l.fulfillmentTotal, 0);
  return {
    lines,
    itemsTotal,
    fulfillmentTotal,
    payLater: lines.reduce((s, l) => s + l.payLater, 0),
    total: itemsTotal + fulfillmentTotal,
    hasOnRequest: lines.some((l) => l.quote.onRequest.length > 0 || l.fulfillment.price === null),
    count: lines.reduce((s, l) => s + l.item.qty, 0),
  };
}
