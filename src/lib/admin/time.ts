/** Dates in Israel's time zone: "today" and "this month" are Israel's, wherever the server runs. */
export const TZ = "Asia/Jerusalem";

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** YYYY-MM-DD in Israel. */
export function israelDate(d: Date): string {
  return ymd.format(d);
}

/** Minutes Israel is ahead of UTC at that instant (120 or 180). */
function offsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const local = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"));
  return Math.round((local - at.getTime()) / 60_000);
}

/** The instant a day (YYYY-MM-DD) starts in Israel. */
export function israelDayStart(date: string): Date {
  const utc = new Date(`${date}T00:00:00Z`);
  const guess = new Date(utc.getTime() - offsetMinutes(utc) * 60_000);
  // the offset at the guess itself (a day the clocks change)
  return new Date(utc.getTime() - offsetMinutes(guess) * 60_000);
}

/** The day after a YYYY-MM-DD. */
export function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export const validDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** "4.11.2026, 14:05" */
export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("he-IL", { timeZone: TZ, day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

/** "יום ד׳, 4.11.2026" for a YYYY-MM-DD */
export function formatDay(date: string | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", weekday: "short", day: "numeric", month: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00Z`));
}
