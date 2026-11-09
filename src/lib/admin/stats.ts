import { and, count, countDistinct, desc, eq, gte, inArray, isNotNull, sql, sum } from "drizzle-orm";
import type { Db } from "@/db";
import { leads, orderItems, orders, visits, type VisitChannel } from "@/db/schema";
import { SALE_STATUSES } from "./status";
import { israelDate, israelDayStart } from "./time";

/** The "נתונים" page (/admin/stats): the shop's numbers for the last 7, 30 or 90 days. Server code only. */

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export function readRange(v: string | string[] | undefined): Range {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : 30;
}

/** The range's days, oldest first (YYYY-MM-DD, Israel), today included. */
export function rangeDays(days: number, now = new Date()): string[] {
  const today = israelDate(now);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(israelDate(new Date(Date.parse(`${today}T12:00:00Z`) - i * 86_400_000)));
  return out;
}

export interface Named {
  label: string;
  value: number;
  /** a second number: revenue, or a share */
  extra?: number;
}

export interface Stats {
  days: string[];
  /** visitors (unique a day, summed) and page views per day */
  daily: { day: string; visitors: number; pageviews: number }[];
  visitors: number;
  pageviews: number;
  orders: number;
  revenue: number;
  leads: number;
  whatsapp: number;
  phone: number;
  /** (orders + leads) / visitors, 0–1; null with no visitors */
  conversion: number | null;
  /** the first day visits were counted, or null before the first one */
  countingSince: string | null;
  products: Named[];
  addons: Named[];
  pages: Named[];
  sources: Named[];
  devices: Named[];
}

export const CHANNEL_LABEL: Record<VisitChannel, string> = { google: "Google", facebook: "פייסבוק / אינסטגרם", direct: "ישירות", other: "אתרים אחרים" };
const DEVICE_LABEL: Record<string, string> = { mobile: "נייד", desktop: "מחשב" };

export async function stats(db: Db, range: Range, now = new Date()): Promise<Stats> {
  const days = rangeDays(range, now);
  const from = days[0];
  const since = israelDayStart(from);
  const sold = and(isNotNull(orders.paidAt), gte(orders.paidAt, since), inArray(orders.status, SALE_STATUSES), eq(orders.isTest, false));
  const inRange = gte(visits.day, from);
  const views = and(inRange, eq(visits.kind, "pageview"));

  const [daily, [sales], [leadCount], clicks, products, addons, pages, sources, devices, [first]] = await Promise.all([
    db
      .select({ day: visits.day, visitors: countDistinct(visits.visitor), pageviews: count() })
      .from(visits)
      .where(views)
      .groupBy(visits.day),
    db.select({ n: count(), amount: sum(orders.total) }).from(orders).where(sold),
    db.select({ n: count() }).from(leads).where(gte(leads.createdAt, since)),
    db
      .select({ kind: visits.kind, n: count() })
      .from(visits)
      .where(and(inRange, inArray(visits.kind, ["whatsapp_click", "phone_click"])))
      .groupBy(visits.kind),
    db
      .select({ label: orderItems.productName, value: sql<number>`sum(${orderItems.qty})::int`, extra: sql<number>`sum(${orderItems.itemsTotal})::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(sold)
      .groupBy(orderItems.productName)
      .orderBy(desc(sql`sum(${orderItems.qty})`), desc(sql`sum(${orderItems.itemsTotal})`))
      .limit(5),
    db
      .select({ label: sql<string>`a->>'label'`, value: sql<number>`sum(coalesce((a->>'qty')::int, 1) * ${orderItems.qty})::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(sql`jsonb_array_elements(${orderItems.addons}) a`, sql`true`)
      .where(and(sold, sql`coalesce((a->>'gift')::boolean, false) = false`))
      .groupBy(sql`a->>'label'`)
      .orderBy(desc(sql`sum(coalesce((a->>'qty')::int, 1) * ${orderItems.qty})`))
      .limit(5),
    db.select({ label: visits.path, value: count() }).from(visits).where(views).groupBy(visits.path).orderBy(desc(count())).limit(6),
    db
      .select({ label: visits.channel, value: countDistinct(visits.visitor) })
      .from(visits)
      .where(and(views, isNotNull(visits.channel)))
      .groupBy(visits.channel)
      .orderBy(desc(countDistinct(visits.visitor))),
    db.select({ label: visits.device, value: countDistinct(visits.visitor) }).from(visits).where(views).groupBy(visits.device).orderBy(desc(countDistinct(visits.visitor))),
    db.select({ day: sql<string | null>`min(${visits.day})` }).from(visits),
  ]);

  const byDay = new Map(daily.map((d) => [d.day, d]));
  const series = days.map((day) => ({ day, visitors: Number(byDay.get(day)?.visitors ?? 0), pageviews: Number(byDay.get(day)?.pageviews ?? 0) }));
  const visitors = series.reduce((s, d) => s + d.visitors, 0);
  const click = (k: string) => Number(clicks.find((c) => c.kind === k)?.n ?? 0);
  const orderCount = Number(sales?.n ?? 0);
  const leadTotal = Number(leadCount?.n ?? 0);
  const share = (rows: { label: string | null; value: number }[], name: (l: string) => string) => {
    const total = rows.reduce((s, r) => s + Number(r.value), 0);
    return rows.map((r) => ({ label: name(r.label ?? ""), value: Number(r.value), extra: total ? Number(r.value) / total : 0 }));
  };
  return {
    days,
    daily: series,
    visitors,
    pageviews: series.reduce((s, d) => s + d.pageviews, 0),
    orders: orderCount,
    revenue: Number(sales?.amount ?? 0),
    leads: leadTotal,
    whatsapp: click("whatsapp_click"),
    phone: click("phone_click"),
    conversion: visitors ? (orderCount + leadTotal) / visitors : null,
    countingSince: first?.day ?? null,
    products: products.map((p) => ({ label: p.label, value: Number(p.value), extra: Number(p.extra) })),
    addons: addons.map((a) => ({ label: a.label, value: Number(a.value) })),
    pages: pages.map((p) => ({ label: p.label, value: Number(p.value) })),
    sources: share(sources, (l) => CHANNEL_LABEL[l as VisitChannel] ?? l),
    devices: share(devices, (l) => DEVICE_LABEL[l] ?? l),
  };
}
