import { getDb } from "@/db";
import { ADMIN_COOKIE } from "@/lib/admin/auth";
import { site } from "@/lib/catalog";
import { rateLimiter } from "@/lib/leads";
import { visitHosts } from "@/lib/analytics";
import { checkVisit, isBot, recordVisit } from "@/lib/visits";

// The site's own visit statistics (src/lib/visits.ts): a page view, or a click
// on WhatsApp or the phone, from the beacon on every public page
// (src/components/VisitBeacon.tsx). Cookieless; no IP or user agent is kept.
export const dynamic = "force-dynamic";

const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
const allow = rateLimiter(300, 10 * 60_000);
const hosts = visitHosts(site.url);

/** Body: { kind: "pageview" | "whatsapp_click" | "phone_click", path, referrer?, utm_source?, utm_medium?, gclid?, fbclid?, entry? }. Always answers 204. */
export async function POST(req: Request) {
  const db = getDb();
  // only the real domain counts: never a preview or *.vercel.app
  if (!db || !hosts.includes(new URL(req.url).hostname.toLowerCase())) return done();
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 500);
  if (isBot(ua)) return done();
  // the business's own browsing, signed in to the admin, doesn't count
  if (new RegExp(`(^|;\\s*)${ADMIN_COOKIE}=`).test(req.headers.get("cookie") ?? "")) return done();
  const text = await req.text();
  if (text.length > 4000) return done();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return done();
  }
  const visit = checkVisit(body);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!visit || !allow(ip)) return done();
  try {
    await recordVisit(db, visit, { ip, ua }, hosts);
  } catch (e) {
    console.warn("[visits] not saved", e instanceof Error ? e.message : e);
  }
  return done();
}
