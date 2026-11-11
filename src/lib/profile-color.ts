import type { Locale } from "@/i18n";
import { addonsFor, catalog, getProduct, plain } from "./catalog";
import type { Product, Selections } from "./types";

/**
 * The profiles' colour, white or black: the add-on chosen above the builder's
 * steps (₪0 both ways). A quote lists only a choice other than the default, so
 * white never showed on an order; every order record now says the colour on a
 * line of its own (order_items.profile_color, the emails, the admin, Z-Credit,
 * WhatsApp).
 */
export const PROFILE_ADDON = "profile-color";
export const PROFILE_COLORS = ["white", "black"] as const;
export type ProfileColor = (typeof PROFILE_COLORS)[number];

const TEXT = {
  he: { title: "צבע פרופיל", white: "לבן", black: "שחור", unknown: "לא צוין", mixed: "מעורב" },
  en: { title: "Profile colour", white: "White", black: "Black", unknown: "Not specified", mixed: "Mixed" },
} as const;

export const isProfileColor = (x: unknown): x is ProfileColor => PROFILE_COLORS.includes(x as ProfileColor);

/** The product lets the customer pick the profiles' colour. */
export const offersProfile = (product: Product) => addonsFor(product).some((a) => a.id === PROFILE_ADDON);

/** The colour picked for a product, null when it offers none or none was picked. */
export function profileColorOf(product: Product, selections: Selections): ProfileColor | null {
  const v = selections[PROFILE_ADDON];
  return offersProfile(product) && isProfileColor(v) ? v : null;
}

/** "לבן", "שחור", or "לא צוין" for null. */
export const profileColorName = (c: ProfileColor | null, locale: Locale = "he") => TEXT[locale][c ?? "unknown"];

/** "צבע פרופיל: לבן" */
export const profileLine = (c: ProfileColor | null, locale: Locale = "he") => `${TEXT[locale].title}: ${profileColorName(c, locale)}`;

/** The labels an order line had for the colour before it was kept on its own: "<add-on name>: <choice>", in either language. */
function oldLabels(): { any: string[]; black: string[] } {
  const any: string[] = [];
  const black: string[] = [];
  for (const locale of ["he", "en"] as const) {
    const a = catalog(locale).addons.find((x) => x.id === PROFILE_ADDON);
    if (!a) continue;
    any.push(`${plain(a.name)}:`);
    const c = a.choices?.find((x) => x.id === "black");
    if (c) black.push(plain(`${a.name}: ${c.label}`));
  }
  return { any, black };
}

/** An order line's add-on that is the profile colour (shown on its own line instead). */
export const isProfileAddon = (label: string) => oldLabels().any.some((p) => label.startsWith(p));

interface SavedItem {
  productSlug: string;
  profileColor: string | null;
  addons: { label: string }[];
}

/**
 * The colour of a saved order line: its own column, or for an older order the
 * black add-on line it had (white was the default and was never kept, so an
 * older line without black reads null: "לא צוין", never a guess).
 */
export function savedProfileColor(i: SavedItem): ProfileColor | null {
  if (isProfileColor(i.profileColor)) return i.profileColor;
  const { black } = oldLabels();
  return i.addons.some((a) => black.includes(a.label)) ? "black" : null;
}

/** Whether an order line has a colour to show: one was saved, or the product offers the choice. */
function hasProfile(i: SavedItem): boolean {
  if (isProfileColor(i.profileColor)) return true;
  const p = getProduct(i.productSlug, "he");
  return p ? offersProfile(p) : savedProfileColor(i) !== null;
}

/** What an order page and an email show for a saved line: the colour's own line (or none), and the other add-ons. */
export function itemProfile<T extends SavedItem>(i: T): { show: boolean; color: ProfileColor | null; line: string; addons: T["addons"] } {
  const color = savedProfileColor(i);
  return { show: hasProfile(i), color, line: profileLine(color), addons: i.addons.filter((a) => !isProfileAddon(a.label)) };
}

/** An order's colours in one word for a list: "לבן", "שחור", "לא צוין", "מעורב" when its items differ, null when none has a colour to show. */
export function orderProfileTag(items: SavedItem[]): string | null {
  const names = new Set(items.filter(hasProfile).map((i) => profileColorName(savedProfileColor(i))));
  if (names.size === 0) return null;
  return names.size === 1 ? [...names][0] : TEXT.he.mixed;
}
