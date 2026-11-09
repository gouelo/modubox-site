"use client";

import { useState } from "react";

export interface DayPoint {
  day: string;
  visitors: number;
  pageviews: number;
}

const short = (day: string) => `${Number(day.slice(8, 10))}.${Number(day.slice(5, 7))}`;
const weekday = (day: string) => new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", weekday: "short" }).format(new Date(`${day}T12:00:00Z`));

/**
 * Visitors a day, as thin columns from one baseline (oldest on the left, as the
 * dates read). Hover or tap a day for its numbers; the same numbers are in a
 * table for screen readers.
 */
export function DailyChart({ data }: { data: DayPoint[] }) {
  const [at, setAt] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.visitors));
  const shown = at === null ? null : data[at];
  return (
    <div>
      <div className="mb-2 h-5 text-sm text-ink-soft" aria-hidden>
        {shown ? (
          <span>
            <b className="text-ink">
              {weekday(shown.day)} {short(shown.day)}
            </b>{" "}
            · {shown.visitors.toLocaleString("he-IL")} מבקרים · {shown.pageviews.toLocaleString("he-IL")} צפיות
          </span>
        ) : (
          <span>הצביעו על יום כדי לראות את המספרים</span>
        )}
      </div>
      <div dir="ltr" className="relative" aria-hidden onMouseLeave={() => setAt(null)}>
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <span className="absolute -top-2.5 left-0 bg-white pe-1 text-[11px] leading-none text-ink-soft">{max.toLocaleString("he-IL")}</span>
        <div className="flex h-28 items-end gap-[2px] border-b border-ink/30">
          {data.map((d, i) => (
            <div key={d.day} className="flex h-full flex-1 cursor-default items-end justify-center" onMouseEnter={() => setAt(i)} onClick={() => setAt(i)}>
              <div
                className={`w-full max-w-6 rounded-t-[4px] transition-colors ${at === i ? "bg-brand-dark" : "bg-brand"}`}
                style={{ height: d.visitors ? `${Math.max(3, (d.visitors / max) * 100)}%` : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink-soft">
          <span>{short(data[0].day)}</span>
          <span>{short(data[data.length - 1].day)}</span>
        </div>
      </div>
      <table className="sr-only">
        <caption>מבקרים וצפיות בכל יום</caption>
        <thead>
          <tr>
            <th scope="col">יום</th>
            <th scope="col">מבקרים</th>
            <th scope="col">צפיות</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{short(d.day)}</td>
              <td>{d.visitors}</td>
              <td>{d.pageviews}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
