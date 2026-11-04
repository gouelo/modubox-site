import type { LeadAttribution } from "@/db/schema";
import { asset } from "./paths";

/**
 * Where a visit came from, for the leads (never sent to analytics): the
 * UTM tags and ad click ids of the landing URL, kept for the visit in
 * sessionStorage. A later URL with tags of its own replaces them.
 */
const KEY = "modubox-attribution";
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;

export function attributionFrom(url: string, referrer: string, saved: LeadAttribution | null): LeadAttribution | null {
  const u = new URL(url);
  const tags: LeadAttribution = {};
  for (const p of PARAMS) {
    const v = u.searchParams.get(p)?.trim().slice(0, 300);
    if (v) tags[p] = v;
  }
  const tagged = Object.keys(tags).length > 0;
  if (saved && !tagged) return null;
  let ref = "";
  try {
    ref = referrer && new URL(referrer).host !== u.host ? new URL(referrer).host : "";
  } catch {
    /* not a URL */
  }
  return { ...tags, landing: (u.pathname + u.search).slice(0, 300), ...(ref ? { referrer: ref } : {}) };
}

/** On every page load: keeps the landing page's tags for the visit. */
export function captureAttribution() {
  try {
    const next = attributionFrom(window.location.href, document.referrer, readAttribution());
    if (next) sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked */
  }
}

export function readAttribution(): LeadAttribution | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v ? (JSON.parse(v) as LeadAttribution) : null;
  } catch {
    return null;
  }
}

/** Sends a lead to POST /api/lead. Answers "ok", "rate_limited" or "failed" (the caller then offers WhatsApp). */
export async function sendLead(lead: Record<string, unknown>): Promise<"ok" | "rate_limited" | "invalid" | "failed"> {
  try {
    const res = await fetch(asset("/api/lead/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, page: window.location.pathname, attribution: readAttribution() ?? {} }),
    });
    if (res.ok) return "ok";
    if (res.status === 429) return "rate_limited";
    if (res.status === 400) return "invalid";
    return "failed";
  } catch {
    return "failed";
  }
}
