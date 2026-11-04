import type { Product } from "@/lib/types";

/**
 * What a product's page is missing, in plain Hebrew, for the admin's catalog
 * only ("חסר מידע"). The site never shows these: a missing fact is left off
 * the page (dimensions) or shown as "בתיאום" (delivery). `todo` in
 * products.json is the free-text note that goes with them.
 */
export function missingInfo(p: Product, all: Product[]): string[] {
  const out: string[] = [];
  const f = p.fulfillment;
  if (f.deliveryAndInstallation === null && (f.delivery === null || f.installation === null) && f.pickup === null) out.push("מחיר הובלה והתקנה (באתר מופיע “בתיאום”, ואי אפשר לשלם אונליין)");
  if (!p.dimensions?.outer) out.push("מידות חוץ וגובה (לא מוצגות באתר)");
  else if (p.dimensions.approximate) out.push("מידות מדויקות מהמפעל (המשוערות מוסתרות באתר)");
  const borrowed = p.images.filter((src) => all.some((o) => o.slug !== p.slug && o.images.includes(src)));
  if (borrowed.length && borrowed.length === p.images.length) out.push("תמונות משלו (כל התמונות משותפות למוצר אחר)");
  if (p.todo) out.push(p.todo);
  return out;
}
