import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { AskBox } from "@/components/admin/AskBox";
import { DailyChart } from "@/components/admin/DailyChart";
import { ils, NoDatabase, PageTitle, Section } from "@/components/admin/ui";
import { askEnabled } from "@/lib/admin/ask";
import { requireAdmin } from "@/lib/admin/session";
import { RANGES, readRange, stats, type Named } from "@/lib/admin/stats";
import { formatDay } from "@/lib/admin/time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "נתונים" };

const num = (n: number) => n.toLocaleString("he-IL");

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm font-semibold text-ink-soft">{label}</div>
      <div className="mt-1 text-2xl font-extrabold sm:text-3xl" dir="ltr">
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-ink-soft">{sub}</div> : null}
    </div>
  );
}

/** Sizes read left to right in a Hebrew line: "מחסן 3×2", never "2×3". */
function Label({ text }: { text: string }) {
  return text.split(/(\d+(?:[.,]\d+)?\s*[×x]\s*\d+(?:[.,]\d+)?)/).map((part, i) => (i % 2 ? <span key={i} dir="ltr">{part}</span> : part));
}

/** A short list: label and number, and with `bars` a thin bar of its share. */
function List({ title, rows, empty, value, bars = false, ltr = false }: { title: string; rows: Named[]; empty: string; value: (r: Named) => string; bars?: boolean; ltr?: boolean }) {
  return (
    <Section title={title}>
      {rows.length ? (
        <ol className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="min-w-0 truncate" dir={ltr ? "ltr" : undefined}>
                  {ltr ? r.label : <Label text={r.label} />}
                </span>
                <span className="shrink-0 font-bold">{value(r)}</span>
              </div>
              {bars ? (
                <div className="mt-1 h-1 rounded-full bg-sand">
                  <div className="h-1 rounded-full bg-brand" style={{ width: `${Math.round((r.extra ?? 0) * 100)}%` }} />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-soft">{empty}</p>
      )}
    </Section>
  );
}

const pct = (r: Named) => `${Math.round((r.extra ?? 0) * 100)}% · ${num(r.value)}`;
const pageName = (path: string) => (path === "/" ? "דף הבית" : path === "/en/" ? "דף הבית (אנגלית)" : path);

/** The shop's numbers: visitors (the site's own cookieless count), sales, leads, clicks, and a question box. */
export default async function StatsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("orders");
  const db = getDb();
  if (!db) return <NoDatabase />;
  const range = readRange((await searchParams).days);
  const s = await stats(db, range);
  const noVisitsYet = !s.countingSince;
  const partial = s.countingSince && s.countingSince > s.days[0];
  return (
    <>
      <PageTitle
        title="נתונים"
        sub={`${formatDay(s.days[0])} – ${formatDay(s.days[s.days.length - 1])}`}
        action={
          <nav aria-label="תקופה">
            <ul className="flex gap-2">
              {RANGES.map((r) => (
                <li key={r}>
                  <Link
                    href={`/admin/stats/?days=${r}`}
                    aria-current={range === r ? "page" : undefined}
                    className={`block rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${range === r ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-ink/30"}`}
                  >
                    {r} ימים
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile label="מבקרים" value={num(s.visitors)} sub={`${num(s.pageviews)} צפיות בדפים`} />
        <Tile label="מכירות" value={ils(s.revenue)} sub={s.orders === 1 ? "הזמנה אחת ששולמה" : `${num(s.orders)} הזמנות ששולמו`} />
        <Tile label="לידים" value={num(s.leads)} sub="פניות מהטפסים באתר" />
        <Tile label="לחיצות וואטסאפ" value={num(s.whatsapp)} />
        <Tile label="לחיצות טלפון" value={num(s.phone)} />
        <Tile label="יחס המרה" value={s.conversion === null ? "–" : `${(s.conversion * 100).toLocaleString("he-IL", { maximumFractionDigits: 1 })}%`} sub="הזמנות ולידים מתוך המבקרים" />
      </div>

      <Section title="מבקרים ביום" className="mt-3">
        {noVisitsYet ? (
          <p className="text-sm text-ink-soft">עוד אין ביקורים. הספירה מתחילה מהביקור הראשון באתר אחרי העדכון הזה.</p>
        ) : (
          <>
            <DailyChart data={s.daily} />
            {partial ? <p className="mt-2 text-xs text-ink-soft">ספירת המבקרים התחילה ב־{formatDay(s.countingSince)}; אין נתונים מלפני כן.</p> : null}
          </>
        )}
      </Section>

      <Section title="שאלו על הנתונים" className="mt-3">
        <AskBox enabled={askEnabled()} />
      </Section>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <List title="המוצרים הנמכרים" rows={s.products} empty="אין מכירות בתקופה הזו." value={(r) => `${num(r.value)} · ${ils(r.extra ?? 0)}`} />
        <List title="תוספות פופולריות" rows={s.addons} empty="אין תוספות בהזמנות של התקופה." value={(r) => num(r.value)} />
        <List title="הדפים הנצפים" rows={s.pages.map((p) => ({ ...p, label: pageName(p.label) }))} empty="עוד אין צפיות." value={(r) => num(r.value)} ltr />
        <List title="מאיפה הגיעו" rows={s.sources} empty="עוד אין ביקורים." value={pct} bars />
        <List title="נייד או מחשב" rows={s.devices} empty="עוד אין ביקורים." value={pct} bars />
      </div>

      <p className="mt-4 text-xs leading-5 text-ink-soft">
        המבקרים נספרים באתר עצמו, בלי עוגיות ובלי לשמור כתובות IP: אותו אדם נספר פעם אחת ביום. גלישה כשאתם מחוברים לניהול לא נספרת. הזמנות בדיקה לא נכללות.
      </p>
    </>
  );
}
