import Link from "next/link";
import { getDb } from "@/db";
import { ActionForm } from "@/components/admin/ContentForms";
import { NoDatabase } from "@/components/admin/ui";
import { catalogRows, changeState, draftCount, liveOverrides, stripCopied } from "@/lib/admin/catalog";
import { publishAction } from "@/lib/admin/catalog-actions";
import { requireAdmin } from "@/lib/admin/session";

/** The catalog: owner only. On every page: what waits to be published. */
export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("catalog");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const rows = await catalogRows(db);
  const live = liveOverrides();
  const drafts = draftCount(rows);
  const hook = !!process.env.VERCEL_DEPLOY_HOOK_URL?.trim();
  const building = rows.products.filter((r) => changeState(r.draft, r.published, live.products[r.slug] && stripCopied(live.products[r.slug])) === "publishing").length + rows.addons.filter((r) => changeState(r.draft, r.published, live.addons[r.id]) === "publishing").length;
  return (
    <>
      <nav aria-label="קטלוג" className="mb-4 flex gap-2">
        <Link href="/admin/catalog/" className="rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-line hover:ring-ink/40">
          מוצרים
        </Link>
        <Link href="/admin/catalog/addons/" className="rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-line hover:ring-ink/40">
          תוספות
        </Link>
      </nav>
      {drafts || building ? (
        <section className="card mb-5 border-amber-300 bg-amber-50/60 p-4">
          <p className="text-sm font-bold">{drafts ? `${drafts} שינויים שמורים כטיוטה, עוד לא באתר.` : hook ? `${building} שינויים פורסמו, והאתר נבנה איתם: בעוד 2–3 דקות הם באוויר.` : `${building} שינויים פורסמו, ויעלו לאתר בפריסה הבאה.`}</p>
          {!drafts && !hook ? (
            <p className="mt-1 text-sm text-ink-soft">
              כדי שפרסום יעלה לאתר מיד: ב־Vercel, Settings → Git → Deploy Hooks, ליצור hook לענף main, ולשמור את הכתובת במשתנה הסביבה VERCEL_DEPLOY_HOOK_URL. עד אז: Redeploy ידני ב־Vercel.
            </p>
          ) : null}
          {drafts ? (
            <ActionForm action={publishAction} submit="פרסום לאתר" confirm={`לפרסם ${drafts} שינויים? המחירים באתר, בסל ובתשלום יתעדכנו יחד אחרי הבנייה (2–3 דקות).`} />
          ) : null}
        </section>
      ) : null}
      {children}
    </>
  );
}
