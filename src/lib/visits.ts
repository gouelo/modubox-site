import { eq, lt } from "drizzle-orm";
import type { Db } from "@/db";
import { visitSalts, visits, VISIT_KINDS, type VisitChannel, type VisitKind } from "@/db/schema";
import { israelDate } from "./admin/time";

/**
 * The site's own visit statistics (POST /api/visit/, the admin's "נתונים"
 * page): cookieless and anonymous. The browser sends the page, the referring
 * site and the UTM tags; the server adds a device class and a visitor hash
 * (the day's random salt + IP + user agent, sha256, cut to 16 characters) and
 * keeps nothing else: no IP, no user agent, no cookie. Server code only, but
 * the pure helpers are shared with the tests.
 */

const BOT = /bot|crawl|spider|slurp|scrap|fetch|headless|lighthouse|pagespeed|preview|monitor|uptime|curl|wget|python|httpx|axios|node-fetch|go-http|java\/|okhttp|facebookexternalhit|discord|skype|embedly|vercel|playwright|puppeteer|phantom|selenium/i;

/** A crawler, a link preview or a script: not a person. An empty or odd user agent counts as a bot. */
export function isBot(ua: string): boolean {
  return ua.length < 20 || !/^Mozilla\//.test(ua) || BOT.test(ua);
}

/** Phones and tablets are "mobile"; everything else "desktop". */
export function deviceOf(ua: string): "mobile" | "desktop" {
  return /Mobi|Android|iPhone|iPad|iPod|Tablet|Silk|Kindle/i.test(ua) ? "mobile" : "desktop";
}

/** Where a page load came from: Google, Facebook/Instagram, direct (no referrer, no tags), or another site. */
export function channelOf(v: { referrerHost: string | null; utmSource: string | null; utmMedium?: string | null; gclid?: boolean; fbclid?: boolean }): VisitChannel {
  const src = (v.utmSource ?? "").toLowerCase();
  const ref = (v.referrerHost ?? "").toLowerCase();
  if (v.gclid || /google|adwords|gads/.test(src) || /(^|\.)google\.[a-z.]+$/.test(ref)) return "google";
  if (v.fbclid || /facebook|^fb$|instagram|^ig$|meta/.test(src) || /(^|\.)(facebook|instagram|fb)\.com$|(^|\.)fb\.me$/.test(ref)) return "facebook";
  if (!src && !ref) return "direct";
  return "other";
}

/** The host of a referrer URL, or null for none, a bad one, or a page of the site itself. */
export function referrerHostOf(referrer: unknown, ownHosts: string[]): string | null {
  if (typeof referrer !== "string" || !referrer) return null;
  try {
    const u = new URL(referrer);
    if (u.protocol !== "http:" && u.protocol !== "https:" && u.protocol !== "android-app:") return null;
    const host = u.hostname.toLowerCase().slice(0, 100);
    return !host || ownHosts.includes(host) ? null : host;
  } catch {
    return null;
  }
}

const tag = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().toLowerCase().slice(0, 100) : null);

export interface VisitBody {
  kind: VisitKind;
  path: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  gclid?: boolean;
  fbclid?: boolean;
  /** a page load (true), not a move inside the site or a click */
  entry?: boolean;
}

/** The browser's report, checked: a known kind and a page of the site (never the admin). */
export function checkVisit(body: unknown): VisitBody | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.kind !== "string" || !(VISIT_KINDS as readonly string[]).includes(b.kind)) return null;
  if (typeof b.path !== "string" || !b.path.startsWith("/") || b.path.startsWith("//")) return null;
  let path: string;
  try {
    path = decodeURI(new URL(b.path, "https://x.invalid").pathname);
  } catch {
    return null;
  }
  if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/")) return null;
  return {
    kind: b.kind as VisitKind,
    path: path.slice(0, 300),
    referrer: typeof b.referrer === "string" ? b.referrer.slice(0, 500) : undefined,
    utm_source: tag(b.utm_source) ?? undefined,
    utm_medium: tag(b.utm_medium) ?? undefined,
    gclid: b.gclid === true,
    fbclid: b.fbclid === true,
    entry: b.entry === true,
  };
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The visitor of a day: never the IP or the user agent themselves. */
export async function visitorHash(salt: string, ip: string, ua: string): Promise<string> {
  return (await sha256Hex(`${salt}|${ip}|${ua}`)).slice(0, 16);
}

let saltCache: { day: string; salt: string } | null = null;

/** The day's random salt (made by the first visit of the day); older ones than yesterday's are deleted. */
export async function dailySalt(db: Db, day: string): Promise<string> {
  if (saltCache?.day === day) return saltCache.salt;
  const fresh = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  await db.insert(visitSalts).values({ day, salt: fresh }).onConflictDoNothing();
  const [row] = await db.select().from(visitSalts).where(eq(visitSalts.day, day));
  const yesterday = israelDate(new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000));
  await db.delete(visitSalts).where(lt(visitSalts.day, yesterday));
  saltCache = { day, salt: row.salt };
  return row.salt;
}

/** For the tests: forget the cached salt. */
export function resetSaltCache() {
  saltCache = null;
}

/** Saves one visit. */
export async function recordVisit(db: Db, v: VisitBody, who: { ip: string; ua: string }, ownHosts: string[], now = new Date()): Promise<void> {
  const day = israelDate(now);
  const referrerHost = v.entry ? referrerHostOf(v.referrer, ownHosts) : null;
  const utmSource = v.utm_source ?? null;
  const utmMedium = v.utm_medium ?? null;
  await db.insert(visits).values({
    at: now,
    day,
    kind: v.kind,
    path: v.path,
    referrerHost,
    utmSource,
    utmMedium,
    channel: v.kind === "pageview" && v.entry ? channelOf({ referrerHost, utmSource, utmMedium, gclid: v.gclid, fbclid: v.fbclid }) : null,
    device: deviceOf(who.ua),
    visitor: await visitorHash(await dailySalt(db, day), who.ip, who.ua),
  });
}
