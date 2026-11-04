import Link from "next/link";
import { getDb } from "@/db";
import { ActionForm } from "@/components/admin/ContentForms";
import { NoDatabase } from "@/components/admin/ui";
import { publishSiteAction } from "@/lib/admin/site-actions";
import { pendingTexts, savedTexts, TEXT_LABEL } from "@/lib/admin/site-texts";
import { requireAdmin } from "@/lib/admin/session";

const TABS = [
  { href: "/admin/site/", label: "פרטי העסק" },
  { href: "/admin/site/promo/", label: "מבצע החודש" },
  { href: "/admin/site/faq/", label: "שאלות נפוצות" },
  { href: "/admin/site/reviews/", label: "ביקורות" },
];

/** The site's texts and reviews: owner only. On every page: what is saved but not yet on the site. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("site");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const pending = pendingTexts(await savedTexts(db));
  const hook = !!process.env.VERCEL_DEPLOY_HOOK_URL?.trim();
  return (
    <>
      <nav aria-label="אתר" className="no-scrollbar -mx-4 mb-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-2">
          {TABS.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="block rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-line hover:ring-ink/40">
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {pending.length ? (
        <section className="card mb-5 border-amber-300 bg-amber-50/60 p-4">
          <p className="text-sm font-bold">שמור ועוד לא באתר: {pending.map((k) => TEXT_LABEL[k]).join(", ")}.</p>
          <p className="mt-1 text-sm text-ink-soft">
            הטקסטים האלה הם חלק מהבנייה של האתר, ולכן עולים אליו עם בנייה מחדש (2–3 דקות).{" "}
            {hook ? "" : "עדיין אין Deploy Hook (VERCEL_DEPLOY_HOOK_URL), אז עד שיוגדר: Redeploy ידני ב־Vercel."}
          </p>
          <ActionForm action={publishSiteAction} submit="פרסום לאתר" confirm="לבנות את האתר עכשיו עם השינויים? (גם שינויי קטלוג שפורסמו יעלו איתם)" />
        </section>
      ) : null}
      {children}
    </>
  );
}
