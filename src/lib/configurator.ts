import { addonsFor, products, site } from "./catalog";
import { configuratorModel } from "./design3d";
import { defaultSelections } from "./pricing";
import type { CartDesign, DesignExtra, Product, Selections } from "./types";

/**
 * The 3D configurator → the cart. The configurator (data/site.json → design3d,
 * an outside app) opens in an iframe in our side panel (ConfiguratorPanel). It
 * keeps the whole design in its own address (?m=3x2&f=d&p=..d.w...), and the
 * contract in docs/configurator-cart.md asks it to send that to us:
 *
 *   parent.postMessage({ type: "modubox:design", design: { query, link } }, "*")       on every change
 *   parent.postMessage({ type: "modubox:add-to-cart", design: { query, link } }, "*")  from its own button
 *
 * We read only messages from the configurator's own origin, decode the query
 * with the configurator's own format, and map it onto the product of that size
 * and its add-ons (data/addons.json). Until it sends anything, the panel's
 * button falls back to the base product in the size and colour the customer
 * confirms, with a link to the configurator.
 */

/** The configurator's origin ("https://….railway.app"); "" when the site has none. */
export const CONFIGURATOR_ORIGIN = (() => {
  try {
    return new URL(site.design3d.url.replace(/\{[^}]*\}/g, "")).origin;
  } catch {
    return "";
  }
})();

export const MESSAGE_DESIGN = "modubox:design";
export const MESSAGE_ADD = "modubox:add-to-cart";
export const MESSAGE_HELLO = "modubox:hello";

/** What a configurator design holds that the cart can sell. */
export interface ConfiguratorDesign {
  /** "3x2": width × depth in metres */
  model: string;
  frame: "dark" | "light";
  /** single doors, the included one among them */
  doors: number;
  doubleDoors: number;
  windows: number;
  glass: number;
  /** glass walls with a shutter */
  shutters: number;
  electric: number;
  kipp: number;
  glassDoors: number;
  /** ventilation grills: in walls and in doors */
  vents: number;
  /** "standard" | "parquetGrey" | "parquetWhite" | "parquetGolden" */
  floor: string;
  installation: boolean;
}

/** The configurator's defaults (its state.js): a 4×3 with dark profiles. */
const DEFAULT_MODEL = "4x3";
/** One character per wall panel, front → right → back → left (the configurator's `p`). */
const PANEL_CHARS = new Set([".", "d", "D", "b", "c", "w", "G", "k", "g", "s", "e"]);
const SIZE_RE = /(\d+(?:[.,]\d+)?)\s*[x×X*]\s*(\d+(?:[.,]\d+)?)/;

function modelOf(raw: string | null): string | null {
  const m = String(raw ?? "").match(SIZE_RE);
  if (!m) return null;
  const n = (s: string) => {
    const v = parseFloat(s.replace(",", "."));
    return v >= 50 ? v / 100 : v;
  };
  const w = n(m[1]);
  const d = n(m[2]);
  if (Math.abs(w - Math.round(w)) > 0.05 || Math.abs(d - Math.round(d)) > 0.05) return null;
  return `${Math.round(w)}x${Math.round(d)}`;
}

function paramsOf(input: string): URLSearchParams {
  const q = input.includes("?") ? input.slice(input.indexOf("?") + 1) : input;
  return new URLSearchParams(q.split("#")[0]);
}

/** Reads a design from the configurator's query string, or a whole link to it. */
export function parseDesign(input: string): ConfiguratorDesign {
  const e = paramsOf(input);
  const model = modelOf(e.get("m") ?? e.get("model") ?? e.get("size")) ?? DEFAULT_MODEL;
  const [w, d] = model.split("x").map(Number);
  const slots = 2 * (w + d);

  let panels = e.get("p") ?? "";
  if (panels.length !== slots || [...panels].some((c) => !PANEL_CHARS.has(c))) panels = "";
  const count = (c: string) => [...panels].filter((x) => x === c).length;
  // without panels the configurator's default: one door, the rest walls
  const doors = panels ? count("d") + count("D") : 1;

  const wallVents = new Set(
    (e.get("vt") ?? "")
      .split(".")
      .filter(Boolean)
      .map((x) => parseInt(x, 10))
      .filter((x) => Number.isInteger(x) && x >= 0 && x < slots),
  ).size;

  return {
    model,
    frame: (e.get("f") ?? "").toLowerCase() === "l" ? "light" : "dark",
    doors,
    doubleDoors: count("b"),
    windows: count("w"),
    glass: count("G"),
    shutters: count("s"),
    electric: count("e"),
    kipp: count("k"),
    glassDoors: count("g"),
    vents: count("D") + wallVents,
    floor: e.get("fl") ?? "standard",
    installation: e.get("in") === "1",
  };
}

/** The Modubox product for a configurator model ("3x2"), if the site sells it. */
export function productForModel(model: string): Product | undefined {
  return products.find((p) => configuratorModel(p) === model);
}

/** The configurator models the site sells, smallest first (for the fallback's size picker). */
export function sellableModels(): { model: string; product: Product }[] {
  return products
    .filter((p) => configuratorModel(p))
    .map((p) => ({ model: configuratorModel(p)!, product: p }))
    .sort((a, b) => a.product.areaM2 - b.product.areaM2 || a.product.widthM - b.product.widthM);
}

/** The configurator's parquet → our WPC floor colours. */
const FLOOR_CHOICE: Record<string, string> = { parquetGrey: "grey", parquetWhite: "light", parquetGolden: "teak" };

export interface ConfiguratorCartItem {
  product: Product;
  selections: Selections;
  design: CartDesign;
}

/**
 * A configurator design as a cart item: the product of its size, the builder's
 * add-ons for what they cover, and extra lines for the rest (a second glass
 * wall at its price; kipp windows and glass doors, which the site doesn't
 * price, "מחיר בתיאום"). The first single door is part of the shed, as in the
 * configurator. null when the site doesn't sell that size.
 */
export function designToCartItem(design: ConfiguratorDesign, link: string): ConfiguratorCartItem | null {
  const product = productForModel(design.model);
  if (!product) return null;
  const offered = new Map(addonsFor(product).map((a) => [a.id, a]));
  const selections: Selections = { ...defaultSelections(product) };
  const extras: DesignExtra[] = [];

  const qty = (id: string, n: number) => {
    if (n > 0 && offered.has(id)) selections[id] = n;
  };
  /** a toggle add-on: the first one in it, any more as an extra line at its price */
  const toggle = (id: string, n: number) => {
    const a = offered.get(id);
    if (n <= 0 || !a) return;
    selections[id] = 1;
    if (n > 1) extras.push({ id: `${id}+`, label: a.name, qty: n - 1, unitPrice: a.price ?? null });
  };

  if (offered.has("profile-color")) selections["profile-color"] = design.frame === "dark" ? "black" : "white";
  toggle("double-door", design.doubleDoors);
  qty("extra-door", Math.max(0, design.doors - 1));
  qty("sliding-window", design.windows);
  qty("vent-grill", design.vents);
  toggle("electric-panel", design.electric);

  const glassWall = offered.get("glass-wall");
  if (glassWall && design.glass + design.shutters > 0) {
    const choice = (id: string) => glassWall.choices?.find((c) => c.id === id);
    selections["glass-wall"] = design.shutters > 0 ? "glass-shutter" : "glass";
    const more = [
      { c: choice("glass-shutter"), n: design.shutters - (design.shutters > 0 ? 1 : 0) },
      { c: choice("glass"), n: design.glass - (design.shutters > 0 ? 0 : 1) },
    ];
    for (const { c, n } of more)
      if (c && n > 0) extras.push({ id: `glass-wall+${c.id}`, label: `${glassWall.name}: ${c.label}`, qty: n, unitPrice: c.price });
  }

  const floor = FLOOR_CHOICE[design.floor];
  if (floor && offered.get("wpc-floor")?.choices?.some((c) => c.id === floor)) selections["wpc-floor"] = floor;

  if (design.kipp > 0) extras.push({ id: "cfg-kipp", label: "חלון קיפ", qty: design.kipp, unitPrice: null });
  if (design.glassDoors > 0) extras.push({ id: "cfg-glass-door", label: "דלת זכוכית", qty: design.glassDoors, unitPrice: null });

  return { product, selections, design: { source: "configurator", link, exact: true, ...(extras.length ? { extras } : {}) } };
}

/** The configurator's link for a design: the configurator's Israeli entry with its query. */
export function designLink(query: string): string {
  const q = query.replace(/^\?/, "");
  return `${CONFIGURATOR_ORIGIN}/il${q ? `?${q}` : ""}`;
}

/**
 * The fallback, while the configurator sends nothing: the base product in the
 * size and colour the customer confirmed, marked as a configurator design whose
 * openings and add-ons a representative goes over with them.
 */
export function fallbackCartItem(model: string, frame: "dark" | "light", link: string): ConfiguratorCartItem | null {
  const product = productForModel(model);
  if (!product) return null;
  const selections: Selections = { ...defaultSelections(product) };
  if (addonsFor(product).some((a) => a.id === "profile-color")) selections["profile-color"] = frame === "dark" ? "black" : "white";
  return { product, selections, design: { source: "configurator", link, exact: false } };
}

/** A message from the configurator, checked: its origin, its type, and a design in it. */
export type ConfiguratorMessage = { kind: "design" | "add"; design: ConfiguratorDesign; link: string };

export function readMessage(origin: string, data: unknown): ConfiguratorMessage | null {
  if (!CONFIGURATOR_ORIGIN || origin !== CONFIGURATOR_ORIGIN) return null;
  if (!data || typeof data !== "object") return null;
  const { type, design } = data as { type?: unknown; design?: unknown };
  if (type !== MESSAGE_DESIGN && type !== MESSAGE_ADD) return null;
  if (!design || typeof design !== "object") return null;
  const { query, link } = design as { query?: unknown; link?: unknown };
  const safeLink = typeof link === "string" && sameOrigin(link) ? link : null;
  const source = typeof query === "string" ? query : safeLink;
  if (source === null) return null;
  return { kind: type === MESSAGE_ADD ? "add" : "design", design: parseDesign(source), link: safeLink ?? designLink(paramsOf(source).toString()) };
}

function sameOrigin(link: string): boolean {
  try {
    return new URL(link).origin === CONFIGURATOR_ORIGIN;
  } catch {
    return false;
  }
}
