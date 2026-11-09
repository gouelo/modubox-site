import { and, count, desc, eq, gte, ilike, isNull, lt, or, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import { leadEvents, leads, type Lead, type LeadEvent, type LeadStatus } from "@/db/schema";
import { isLeadStatus, LEAD_STATUS_LABEL, leadStatus } from "./lead-status";
import { LEAD_SOURCES } from "../notify";
import { csvCell } from "./csv";
import { formatDateTime, israelDayStart, nextDay, validDate } from "./time";

/** The admin's leads tab: list, filters, a lead's page, its status and notes. Server code only. */

export { isLeadStatus, LEAD_STATUS_LABEL, LEAD_STATUS_TONE, leadStatus } from "./lead-status";

export const LEADS_PAGE_SIZE = 50;

export interface LeadFilters {
  /** "all" or one status */
  status: LeadStatus | "all";
  q: string;
  /** YYYY-MM-DD, by the day the lead came in */
  from?: string;
  to?: string;
  page: number;
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** The filters from a page's address (?status=new&q=…&from=…&to=…&page=2). */
export function readLeadFilters(p: Params): LeadFilters {
  const s = one(p.status);
  const from = one(p.from);
  const to = one(p.to);
  return {
    status: isLeadStatus(s) ? s : "all",
    q: one(p.q).trim().slice(0, 80),
    from: validDate(from) ? from : undefined,
    to: validDate(to) ? to : undefined,
    page: Math.max(1, Math.min(1000, Number.parseInt(one(p.page), 10) || 1)),
  };
}

/** The address of a list with these filters (only what differs from the default). */
export function leadFiltersQuery(f: Partial<LeadFilters>): string {
  const q = new URLSearchParams();
  if (f.status && f.status !== "all") q.set("status", f.status);
  if (f.q) q.set("q", f.q);
  if (f.from) q.set("from", f.from);
  if (f.to) q.set("to", f.to);
  if (f.page && f.page > 1) q.set("page", String(f.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Leads not deleted in the admin: every list, count and export reads only these. */
export const liveLead = isNull(leads.deletedAt);

function where(f: LeadFilters): SQL | undefined {
  const conds: (SQL | undefined)[] = [liveLead];
  if (f.status !== "all") conds.push(eq(leads.status, f.status));
  if (f.from) conds.push(gte(leads.createdAt, israelDayStart(f.from)));
  if (f.to) conds.push(lt(leads.createdAt, israelDayStart(nextDay(f.to))));
  if (f.q) {
    const like = `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const digits = f.q.replace(/\D/g, "");
    conds.push(
      or(
        ilike(leads.name, like),
        ilike(leads.phone, like),
        ilike(leads.email, like),
        ilike(leads.city, like),
        ilike(leads.product, like),
        ilike(leads.message, like),
        // a phone typed with or without dashes and spaces
        ...(digits.length >= 3 ? [ilike(leads.phone, `%${digits.split("").join("%")}%`)] : []),
      ),
    );
  }
  const c = conds.filter(Boolean) as SQL[];
  return c.length ? and(...c) : undefined;
}

export async function listAdminLeads(db: Db, f: LeadFilters): Promise<{ rows: Lead[]; total: number }> {
  const w = where(f);
  const [rows, [{ n }]] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(w)
      .orderBy(desc(leads.createdAt), desc(leads.id))
      .limit(LEADS_PAGE_SIZE)
      .offset((f.page - 1) * LEADS_PAGE_SIZE),
    db.select({ n: count() }).from(leads).where(w),
  ]);
  return { rows, total: Number(n) };
}

/** Leads in one status (by default those no one has handled yet), for the home page. */
export async function countNewLeads(db: Db, status: LeadStatus = "new"): Promise<number> {
  const [r] = await db.select({ n: count() }).from(leads).where(and(eq(leads.status, status), liveLead));
  return Number(r?.n ?? 0);
}

/** The latest leads, for the home page. */
export async function recentLeads(db: Db, limit = 5): Promise<Lead[]> {
  return db.select().from(leads).where(liveLead).orderBy(desc(leads.createdAt), desc(leads.id)).limit(limit);
}

export async function getLead(db: Db, id: number): Promise<{ lead: Lead; events: LeadEvent[] } | null> {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), liveLead));
  if (!lead) return null;
  const events = await db.select().from(leadEvents).where(eq(leadEvents.leadId, id)).orderBy(leadEvents.at, leadEvents.id);
  return { lead, events };
}

export type LeadChange = { ok: true } | { ok: false; error: "not_found" | "invalid" };

/** Moves a lead to another status (any to any), and keeps it in its history. */
export async function changeLeadStatus(db: Db, id: number, to: LeadStatus, actor = "admin", now = new Date()): Promise<LeadChange> {
  if (!isLeadStatus(to)) return { ok: false, error: "invalid" };
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(leads).where(and(eq(leads.id, id), liveLead)).for("update");
    if (!row) return { ok: false, error: "not_found" } as const;
    const from = leadStatus(row.status);
    if (from === to) return { ok: true } as const;
    await tx.update(leads).set({ status: to }).where(eq(leads.id, id));
    await tx.insert(leadEvents).values({ leadId: id, kind: "status", fromStatus: from, toStatus: to, actor, at: now });
    return { ok: true } as const;
  });
}

/** An internal note on a lead: into its history, and as its latest note (shown in the list). */
export async function addLeadNote(db: Db, id: number, text: string, actor = "admin", now = new Date()): Promise<LeadChange> {
  const note = text.trim().slice(0, 2000);
  if (!note) return { ok: false, error: "invalid" };
  const [row] = await db.update(leads).set({ notes: note }).where(and(eq(leads.id, id), liveLead)).returning({ id: leads.id });
  if (!row) return { ok: false, error: "not_found" };
  await db.insert(leadEvents).values({ leadId: id, kind: "note", text: note, actor, at: now });
  return { ok: true };
}

/**
 * Deletes a lead from the admin (owner and sales, round 17): a soft delete.
 * The row stays (deleted_at, deleted_by) so its history and past numbers hold,
 * but it leaves every list, count, export and the AI questions' view.
 */
export async function deleteLead(db: Db, id: number, actor = "admin", now = new Date()): Promise<LeadChange> {
  if (!Number.isSafeInteger(id) || id < 1) return { ok: false, error: "invalid" };
  const [row] = await db.update(leads).set({ deletedAt: now, deletedBy: actor }).where(and(eq(leads.id, id), liveLead)).returning({ id: leads.id });
  return row ? { ok: true } : { ok: false, error: "not_found" };
}

/** The UTM and click ids a lead came with, as one line ("google / cpc · summer · Google Ads"). */
export function leadSource(l: Pick<Lead, "attribution">): string {
  const a = l.attribution ?? {};
  return [a.utm_source && `${a.utm_source}${a.utm_medium ? ` / ${a.utm_medium}` : ""}`, a.utm_campaign, a.gclid && "Google Ads", a.fbclid && "Meta"].filter(Boolean).join(" · ");
}

/** Every lead a list's filters match (no paging), for the CSV file. */
export async function exportLeads(db: Db, f: LeadFilters, limit = 5000): Promise<Lead[]> {
  return db.select().from(leads).where(where(f)).orderBy(desc(leads.createdAt), desc(leads.id)).limit(limit);
}

const HEADER = ["מספר", "התקבל", "סטטוס", "סוג", "שם", "טלפון", "מייל", "עיר", "מוצר", "מספר הזמנה", "הודעה", "דף", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "דף נחיתה", "הפניה", "הערה אחרונה", "שפה"];

/** Leads as a CSV file that opens right in Excel (UTF-8 with a BOM). */
export function leadsCsv(rows: Lead[]): string {
  const lines = [HEADER.map(csvCell).join(",")];
  for (const l of rows) {
    const a = l.attribution ?? {};
    lines.push(
      [
        l.id,
        formatDateTime(l.createdAt),
        LEAD_STATUS_LABEL[leadStatus(l.status)],
        LEAD_SOURCES[l.kind] ?? l.kind,
        l.name,
        l.phone,
        l.email,
        l.city,
        l.product,
        l.orderId,
        l.message,
        l.page,
        a.utm_source,
        a.utm_medium,
        a.utm_campaign,
        a.utm_term,
        a.utm_content,
        a.gclid,
        a.fbclid,
        a.landing,
        a.referrer,
        l.notes,
        l.locale === "en" ? "אנגלית" : "עברית",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
