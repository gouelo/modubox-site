import { count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders, siteSettings } from "@/db/schema";
import { ActionForm } from "@/components/admin/ContentForms";
import { CopyButton } from "@/components/admin/CopyButton";
import { PageTitle, Section } from "@/components/admin/ui";
import { testProductAction } from "@/lib/admin/catalog-actions";
import { requestOrigin } from "@/lib/admin/origin";
import { requireAdmin } from "@/lib/admin/session";
import { TEST_ENABLED } from "@/lib/catalog";
import testFile from "../../../../../../data/test-product.json";

export const dynamic = "force-dynamic";
export const metadata = { title: "מוצר בדיקה" };


/** The hidden 1 ₪ product for a real card payment test: its switch and its secret link. */
export default async function TestProductPage() {
  await requireAdmin("catalog");
  const db = getDb()!;
  const [[setting], [{ n }], origin] = await Promise.all([
    db.select().from(siteSettings).where(eq(siteSettings.key, "test_product")),
    db.select({ n: count() }).from(orders).where(eq(orders.isTest, true)),
    requestOrigin(),
  ]);
  const saved = (setting?.value as { enabled?: boolean } | undefined)?.enabled ?? TEST_ENABLED;
  const link = `${origin}/p/${testFile.product.slug}/`;
  return (
    <>
      <PageTitle title="מוצר בדיקה ב־1 ₪" sub="מוצר נסתר לבדיקת תשלום אמיתי בכרטיס. לא מופיע בחנות, בחיפוש או במפת האתר: רק בקישור הסודי." />
      <Section title={TEST_ENABLED ? "פעיל באתר עכשיו" : "כבוי באתר עכשיו"}>
        {saved !== TEST_ENABLED ? <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">{saved ? "הופעל, ויעלה לאתר בבנייה הבאה." : "כובה, וייעלם מהאתר בבנייה הבאה."}</p> : null}
        <ActionForm action={testProductAction} submit={saved ? "כיבוי מוצר הבדיקה" : "הפעלת מוצר הבדיקה"} confirm={saved ? "לכבות את מוצר הבדיקה? הקישור הסודי יפסיק לעבוד אחרי הבנייה." : "להפעיל את מוצר הבדיקה ב־1 ₪? הוא יעבוד רק בקישור הסודי."}>
          <input type="hidden" name="enabled" value={saved ? "off" : "on"} />
        </ActionForm>
        <p className="mt-3 text-xs leading-5 text-ink-soft">המוצר הוא חלק מהקוד של הסל, ולכן שינוי עולה לאתר עם בנייה מחדש (2–3 דקות).</p>
      </Section>
      <Section title="הקישור הסודי" className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <bdi dir="ltr" className="min-w-0 flex-1 break-all rounded-lg bg-sand px-3 py-2 font-mono text-sm">
            {link}
          </bdi>
          <CopyButton text={link} label="העתקת הקישור" />
        </div>
        <p className="mt-2 text-xs leading-5 text-ink-soft">
          הזמנות של מוצר הבדיקה מסומנות “בדיקה” ולא נספרות במכירות. עד היום: {Number(n) === 1 ? "הזמנת בדיקה אחת" : `${n} הזמנות בדיקה`}. את ה־1 ₪ אפשר לזכות בפאנל של Z-Credit.
        </p>
      </Section>
    </>
  );
}
