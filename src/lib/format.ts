import type { Locale } from "@/i18n/config";

const num = { he: new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }), en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }) };

/** "1,190 ₪" in Hebrew, "₪1,190" in English. */
export function formatILS(n: number, locale: Locale = "he"): string {
  return locale === "he" ? `${num.he.format(n)} ₪` : `₪${num.en.format(n)}`;
}

export function formatCm(n: number, locale: Locale = "he"): string {
  return locale === "he" ? `${num.he.format(n)} ס"מ` : `${num.en.format(n)} cm`;
}
