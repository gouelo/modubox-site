import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import type { Db } from "@/db";
import { LEAD_KINDS, leads, type Lead, type LeadAttribution, type LeadKind } from "@/db/schema";
import { validPhone } from "./phone";
import { LEAD_SOURCES, leadEmail, leadsEmailConfig, sendEmail } from "./notify";

/**
 * Leads from the site's forms (POST /api/lead): checked here, saved in the
 * database and emailed to the business. Each of the two goes on if the other
 * fails; only when both fail does the customer hear it didn't go through (and
 * gets WhatsApp instead), and the whole lead is in the logs.
 */
export interface NewLead {
  kind: LeadKind;
  locale: "he" | "en";
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  message: string | null;
  page: string | null;
  product: string | null;
  orderId: string | null;
  attribution: LeadAttribution;
}

const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "landing", "referrer"] as const;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "");
const opt = (v: unknown, max: number) => str(v, max) || null;

export type LeadCheck = { ok: true; lead: NewLead } | { ok: true; spam: true } | { ok: false; error: "invalid_name" | "invalid_phone" | "invalid_email" | "invalid_request" };

/** Checks a form's body. `website` is the honeypot: a hidden field only bots fill in. */
export function checkLead(body: unknown): LeadCheck {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_request" };
  const b = body as Record<string, unknown>;
  if (str(b.website, 200)) return { ok: true, spam: true };
  const locale = b.locale === "en" ? "en" : "he";
  const kind = LEAD_KINDS.includes(b.kind as LeadKind) ? (b.kind as LeadKind) : "contact";
  const name = str(b.name, 100);
  const phone = str(b.phone, 30);
  const email = opt(b.email, 200);
  if (name.length < 2) return { ok: false, error: "invalid_name" };
  if (!validPhone(phone, locale)) return { ok: false, error: "invalid_phone" };
  if (email && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) return { ok: false, error: "invalid_email" };
  const a = (b.attribution && typeof b.attribution === "object" ? b.attribution : {}) as Record<string, unknown>;
  const attribution: LeadAttribution = {};
  for (const k of ATTRIBUTION_KEYS) {
    const v = str(a[k], 300);
    if (v) attribution[k] = v;
  }
  const page = str(b.page, 300);
  return {
    ok: true,
    lead: {
      kind,
      locale,
      name,
      phone,
      email,
      city: opt(b.city, 100),
      message: opt(b.message, kind === "order" ? 4000 : 2000),
      page: page.startsWith("/") ? page : null,
      product: opt(b.product, 200),
      orderId: str(b.orderId, 20).replace(/\D/g, "") || null,
      attribution,
    },
  };
}

/** A basic limit per visitor (per server instance): `max` leads in `windowMs`. */
export function rateLimiter(max = 5, windowMs = 10 * 60_000) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (hits.size > 5000) hits.clear();
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

export type LeadResult = { saved: boolean; emailed: boolean; id: number | null };

/** Saves the lead and emails it; never throws. */
export async function handleLead(db: Db | null, lead: NewLead, origin: string, now = new Date()): Promise<LeadResult> {
  let id: number | null = null;
  if (db) {
    try {
      const [row] = await db.insert(leads).values({ ...lead, createdAt: now }).returning({ id: leads.id });
      id = row.id;
    } catch (e) {
      console.error("[leads] saving the lead failed", { error: String(e) });
    }
  }
  let emailed = false;
  const config = leadsEmailConfig();
  if (config) {
    try {
      const resendId = await sendEmail(config, { ...leadEmail({ ...lead, id, createdAt: now }, origin), replyTo: lead.email ?? undefined });
      console.info("[leads] lead email sent", { id, to: config.to, resendId });
      emailed = true;
    } catch (e) {
      console.error("[leads] lead email failed", { id, error: String(e) });
    }
  } else console.warn("[leads] no lead email: RESEND_API_KEY or LEADS_EMAIL_TO / ORDER_EMAIL_TO missing");
  if (emailed && id !== null && db) {
    await db
      .update(leads)
      .set({ emailedAt: now })
      .where(eq(leads.id, id))
      .catch((e) => console.error("[leads] marking the lead emailed failed", { id, error: String(e) }));
  }
  // never lost silently: when it is neither saved nor emailed, the whole lead is in the logs
  if (id === null && !emailed) console.error("[leads] LEAD NOT SAVED OR EMAILED", lead);
  else if (id === null) console.warn("[leads] lead emailed but not saved", lead);
  return { saved: id !== null, emailed, id };
}

/** The newest leads first, for /admin/leads; `q` searches name, phone, email, city and product. */
export async function listLeads(db: Db, q = "", limit = 200): Promise<Lead[]> {
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const where = q ? or(ilike(leads.name, like), ilike(leads.phone, like), ilike(leads.email, like), ilike(leads.city, like), ilike(leads.product, like)) : undefined;
  // leads deleted in the admin stay out
  return db.select().from(leads).where(and(where, isNull(leads.deletedAt))).orderBy(desc(leads.createdAt), desc(leads.id)).limit(limit);
}

export const LEAD_KIND_LABELS: Record<LeadKind, string> = LEAD_SOURCES;
