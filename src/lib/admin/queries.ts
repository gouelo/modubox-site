import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, lt, max, ne, or, sql, sum, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import { orderItems, orders, type Order } from "@/db/schema";
import { customerKey } from "../orders";
import { CANCELLED, isStatus, OPEN, SALE_STATUSES, shownStatus } from "./status";
import { israelDate, israelDayStart, nextDay, validDate } from "./time";
import { orderProfileTag } from "../profile-color";

/** The admin panel's reads. Server code only. */

export const PAGE_SIZE = 50;

/** Which orders a list shows: paid ones (the default), new, cancelled, unpaid ones, or all. */
export type OrderView = "paid" | "all" | "new" | "cancelled" | "pending_payment";

export interface OrderFilters {
  view: OrderView;
  q: string;
  /** YYYY-MM-DD, by the day the order was placed */
  from?: string;
  to?: string;
  page: number;
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** The filters from a page's address (?view=open&q=…&from=…&to=…&page=2). */
export function readFilters(p: Params): OrderFilters {
  const v = one(p.view);
  // old addresses (?view=open, ?view=scheduled, …) land on what the status now shows as
  const view: OrderView = v === "all" ? v : v === "open" ? "new" : isStatus(v) ? (shownStatus(v) as OrderView) : "paid";
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(p.page), 10) || 1));
  const from = one(p.from);
  const to = one(p.to);
  return { view, q: one(p.q).trim().slice(0, 80), from: validDate(from) ? from : undefined, to: validDate(to) ? to : undefined, page };
}

/** The address of a list with these filters (only what differs from the default). */
export function filtersQuery(f: Partial<OrderFilters>): string {
  const q = new URLSearchParams();
  if (f.view && f.view !== "paid") q.set("view", f.view);
  if (f.q) q.set("q", f.q);
  if (f.from) q.set("from", f.from);
  if (f.to) q.set("to", f.to);
  if (f.page && f.page > 1) q.set("page", String(f.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}

function where(f: OrderFilters): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  if (f.view === "paid") conds.push(ne(orders.status, "pending_payment"));
  else if (f.view === "new") conds.push(inArray(orders.status, OPEN));
  else if (f.view === "cancelled") conds.push(inArray(orders.status, CANCELLED));
  else if (f.view !== "all") conds.push(eq(orders.status, f.view));
  if (f.from) conds.push(gte(orders.createdAt, israelDayStart(f.from)));
  if (f.to) conds.push(lt(orders.createdAt, israelDayStart(nextDay(f.to))));
  if (f.q) {
    const like = `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const digits = customerKey(f.q);
    conds.push(
      or(
        ilike(orders.customerName, like),
        ilike(orders.customerEmail, like),
        ilike(orders.city, like),
        ilike(orders.id, like),
        ilike(orders.zcreditReference, like),
        ...(digits.length >= 3 ? [ilike(orders.customerKey, `%${digits}%`)] : []),
      ),
    );
  }
  const c = conds.filter(Boolean) as SQL[];
  return c.length ? and(...c) : undefined;
}

export async function listOrders(db: Db, f: OrderFilters): Promise<{ rows: Order[]; total: number }> {
  const w = where(f);
  const [rows, [{ n }]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(w)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((f.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(orders).where(w),
  ]);
  return { rows, total: Number(n) };
}

/** Every order the filters match, for the CSV export (up to 10,000). */
export async function exportOrders(db: Db, f: OrderFilters) {
  const rows = await db.select().from(orders).where(where(f)).orderBy(desc(orders.createdAt)).limit(10_000);
  const ids = rows.map((r) => r.id);
  const items = ids.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids)).orderBy(asc(orderItems.position)) : [];
  const byOrder = new Map<string, typeof items>();
  for (const i of items) byOrder.set(i.orderId, [...(byOrder.get(i.orderId) ?? []), i]);
  return rows.map((order) => ({ order, items: byOrder.get(order.id) ?? [] }));
}

export interface Dashboard {
  today: { amount: number; orders: number };
  month: { amount: number; orders: number };
  /** paid (or, a manual sale, entered) in the last 7 days, not cancelled */
  newOrders: number;
  /** started paying in the last 7 days and didn't finish: worth a call */
  abandoned: number;
  /** the latest of them, with what they ordered (the WhatsApp follow-up) */
  abandonedRecent: Order[];
  recent: Order[];
}

async function sales(db: Db, since: Date) {
  const [r] = await db
    .select({ amount: sum(orders.total), orders: count() })
    .from(orders)
    .where(and(isNotNull(orders.paidAt), gte(orders.paidAt, since), inArray(orders.status, SALE_STATUSES), eq(orders.isTest, false)));
  return { amount: Number(r?.amount ?? 0), orders: Number(r?.orders ?? 0) };
}

export async function dashboard(db: Db, now = new Date()): Promise<Dashboard> {
  const today = israelDate(now);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const countWhere = async (w: SQL | undefined) => Number((await db.select({ n: count() }).from(orders).where(w))[0]?.n ?? 0);
  const abandonedWhere = and(eq(orders.status, "pending_payment"), gte(orders.createdAt, weekAgo), eq(orders.isTest, false));
  const [t, m, newOrders, abandoned, abandonedRecent, recent] = await Promise.all([
    sales(db, israelDayStart(today)),
    sales(db, israelDayStart(`${today.slice(0, 8)}01`)),
    countWhere(and(inArray(orders.status, OPEN), eq(orders.isTest, false), gte(sql`coalesce(${orders.paidAt}, ${orders.createdAt})`, weekAgo))),
    countWhere(abandonedWhere),
    db.select().from(orders).where(abandonedWhere).orderBy(desc(orders.createdAt)).limit(3),
    db.select().from(orders).where(ne(orders.status, "pending_payment")).orderBy(desc(orders.createdAt)).limit(6),
  ]);
  return { today: t, month: m, newOrders, abandoned, abandonedRecent, recent };
}

export interface Customer {
  key: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  /** paid orders (not cancelled or refunded) */
  orders: number;
  spent: number;
  lastOrderAt: Date;
}

/**
 * Customers are the orders grouped by phone number: name, email and city from
 * their latest order. Only people who paid (or whose order was handled).
 */
export async function listCustomers(db: Db, q = "", limit = 200): Promise<Customer[]> {
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const digits = customerKey(q);
  const search = q
    ? or(ilike(orders.customerName, like), ilike(orders.customerEmail, like), ilike(orders.city, like), ...(digits.length >= 3 ? [ilike(orders.customerKey, `%${digits}%`)] : []))
    : undefined;
  const sale = and(inArray(orders.status, SALE_STATUSES), eq(orders.isTest, false));
  const paid = sql<number>`count(*) filter (where ${sale})`;
  const spent = sql<number>`coalesce(sum(${orders.total}) filter (where ${sale}), 0)`;
  const groups = await db
    .select({ key: orders.customerKey, orders: paid, spent, lastOrderAt: max(orders.createdAt) })
    .from(orders)
    .where(and(ne(orders.status, "pending_payment"), search))
    .groupBy(orders.customerKey)
    .orderBy(desc(max(orders.createdAt)))
    .limit(limit);
  if (!groups.length) return [];
  const latest = await db
    .selectDistinctOn([orders.customerKey])
    .from(orders)
    .where(and(inArray(orders.customerKey, groups.map((g) => g.key)), ne(orders.status, "pending_payment")))
    .orderBy(orders.customerKey, desc(orders.createdAt));
  const byKey = new Map(latest.map((o) => [o.customerKey, o]));
  return groups.map((g) => {
    const o = byKey.get(g.key)!;
    return { key: g.key, name: o.customerName, phone: o.customerPhone, email: o.customerEmail, city: o.city, orders: Number(g.orders), spent: Number(g.spent), lastOrderAt: new Date(g.lastOrderAt ?? o.createdAt) };
  });
}

/** One customer and all their orders (unpaid attempts too). */
export async function getCustomer(db: Db, key: string): Promise<{ customer: Customer | null; orders: Order[] }> {
  const rows = await db.select().from(orders).where(eq(orders.customerKey, key)).orderBy(desc(orders.createdAt));
  if (!rows.length) return { customer: null, orders: [] };
  const counted = rows.filter((o) => SALE_STATUSES.includes(o.status));
  const latest = rows.find((o) => o.status !== "pending_payment") ?? rows[0];
  return {
    customer: {
      key,
      name: latest.customerName,
      phone: latest.customerPhone,
      email: latest.customerEmail,
      city: latest.city,
      orders: counted.length,
      spent: counted.reduce((s, o) => s + o.total, 0),
      lastOrderAt: rows[0].createdAt,
    },
    orders: rows,
  };
}

/** Each order's first product (slug and name), for the abandoned-checkout follow-up. */
/** Each order's profile colour in one word ("לבן", "שחור", "לא צוין", "מעורב"), for the orders list. */
export async function orderProfiles(db: Db, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const items = await db
    .select({ orderId: orderItems.orderId, productSlug: orderItems.productSlug, profileColor: orderItems.profileColor, addons: orderItems.addons })
    .from(orderItems)
    .where(inArray(orderItems.orderId, ids));
  const byOrder = Map.groupBy(items, (i) => i.orderId);
  const out = new Map<string, string>();
  for (const [id, rows] of byOrder) {
    const tag = orderProfileTag(rows);
    if (tag) out.set(id, tag);
  }
  return out;
}

export async function firstProducts(db: Db, ids: string[]): Promise<Map<string, { slug: string; name: string; more: number }>> {
  if (!ids.length) return new Map();
  const items = await db
    .select({ orderId: orderItems.orderId, slug: orderItems.productSlug, name: orderItems.productName })
    .from(orderItems)
    .where(inArray(orderItems.orderId, ids))
    .orderBy(asc(orderItems.orderId), asc(orderItems.position));
  const out = new Map<string, { slug: string; name: string; more: number }>();
  for (const i of items) {
    const had = out.get(i.orderId);
    if (had) had.more++;
    else out.set(i.orderId, { slug: i.slug, name: i.name, more: 0 });
  }
  return out;
}
