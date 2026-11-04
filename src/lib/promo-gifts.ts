import giftsFile from "../../data/promo-gifts.json";
import { israelToday } from "./coupons";
import type { Category, Product } from "./types";

/**
 * The promotion's gifts (data/promo-gifts.json): every shed in the cart earns
 * one by its floor area, a small one below the threshold and a large one from
 * it up. A large gift that is a choice add-on (the WPC floor) makes that
 * add-on free, and its choice (the colour) is the customer's. The cart, the
 * builder and the server's checkout all price with this, so they agree.
 */
export interface GiftRules {
  enabled: boolean;
  /** first and last day, inclusive, YYYY-MM-DD in Israel */
  start: string;
  end: string;
  /** the first day the promotion's small print states, when the gifts start earlier (launch evening) */
  advertisedStart?: string;
  categories: Category[];
  thresholdM2: number;
  /** which gift a shed of exactly thresholdM2 gets */
  atThreshold: "small" | "large";
  small: GiftDef;
  large: GiftDef;
}

export interface GiftDef {
  /** the add-on that is the gift */
  addon: string;
  /** its name in the cart, Hebrew and English */
  label: string;
  en: string;
}

export interface Gift extends GiftDef {
  size: "small" | "large";
}

/** The rules in force (tests switch them off in tests/setup.ts). */
export const giftRules: GiftRules = giftsFile as GiftRules;

/** True on the promotion's days. */
export function giftsActive(today = israelToday(), rules = giftRules): boolean {
  return rules.enabled && today >= rules.start && (!rules.end || today <= rules.end);
}

/** Which gift a product earns today; null: none (not a shed in the promotion, or not its days). */
export function giftFor(product: Product, today = israelToday(), rules = giftRules): Gift | null {
  if (!giftsActive(today, rules) || !rules.categories.includes(product.category)) return null;
  const area = Math.round((product.areaM2 || product.widthM * product.depthM) * 100) / 100;
  const large = area > rules.thresholdM2 || (area === rules.thresholdM2 && rules.atThreshold === "large");
  const size = large ? "large" : "small";
  return { size, ...rules[size] };
}

/** The gift's name in a language. */
export const giftName = (g: GiftDef, locale: "he" | "en") => (locale === "en" ? g.en : g.label);
