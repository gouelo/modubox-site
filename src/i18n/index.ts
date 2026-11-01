import type { Locale } from "./config";
import { en } from "./en";
import { he, type Dict } from "./he";

export type { Dict, Vals } from "./he";
export * from "./config";

const dicts: Record<Locale, Dict> = { he, en };

/** The strings of a language. */
export function dict(locale: Locale): Dict {
  return dicts[locale];
}
