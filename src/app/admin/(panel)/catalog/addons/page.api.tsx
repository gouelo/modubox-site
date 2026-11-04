import Link from "next/link";
import { getDb } from "@/db";
import { PageTitle, ils } from "@/components/admin/ui";
import { addonsWith, catalogRows, changeState, liveOverrides, overridesOf } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/admin/session";
import type { Addon } from "@/lib/types";

export const metadata = { title: "תוספות" };

function priceText(a: Addon): string {
  if (a.pricePerM2) return `${ils(a.pricePerM2)} למ"ר`;
  if (a.choices) {
    const prices = a.choices.map((c) => c.price).filter((p): p is number => typeof p === "number" && p > 0);
    return prices.length ? `${ils(Math.min(...prices))}–${ils(Math.max(...prices))}` : "ללא תוספת";
  }
  return a.price === null || a.price === undefined ? "בתיאום" : ils(a.price);
}

/** The add-ons and their prices (a product can still set its own price for one). */
export default async function AddonsPage() {
  await requireAdmin("catalog");
  const rows = await catalogRows(getDb()!);
  const live = liveOverrides();
  const addons = addonsWith(overridesOf(rows, "draft"));
  return (
    <>
      <PageTitle title="תוספות" sub="המחיר הרגיל של כל תוספת. מחיר מיוחד למוצר מסוים: בעריכת המוצר." />
      <ul className="card divide-y divide-line">
        {addons.map((a) => {
          const row = rows.addons.find((r) => r.id === a.id);
          const state = row ? changeState(row.draft, row.published, live.addons[a.id]) : null;
          return (
            <li key={a.id}>
              <Link href={`/admin/catalog/addon/?id=${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sand/50">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{a.name}</div>
                  <div className="truncate text-xs text-ink-soft">{a.group}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold tabular-nums">{priceText(a)}</span>
                  {state === "draft" ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">טיוטה</span> : state === "publishing" ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800">בפרסום</span> : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
