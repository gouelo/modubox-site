/**
 * A page's SEO and AI-readiness check, from its live HTML (Content → health
 * check): the title, description, headings, images, structured data and the
 * rest a search engine or an AI assistant reads first.
 */
export type Level = "ok" | "warn" | "bad";

export interface Check {
  label: string;
  level: Level;
  detail: string;
}

export interface Health {
  checks: Check[];
  score: number;
  title: string;
  description: string;
  jsonLdTypes: string[];
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return m ? decode(m[1] ?? m[2] ?? "") : null;
};

function metaContent(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) if ((attr(tag, "name") ?? attr(tag, "property"))?.toLowerCase() === key) return attr(tag, "content");
  return null;
}

function linkHref(html: string, rel: string): string[] {
  return (html.match(/<link\b[^>]*>/gi) ?? []).filter((t) => attr(t, "rel")?.toLowerCase() === rel).map((t) => attr(t, "href") ?? "");
}

function typesOf(node: unknown, out: string[]) {
  if (Array.isArray(node)) node.forEach((n) => typesOf(n, out));
  else if (node && typeof node === "object") {
    const t = (node as Record<string, unknown>)["@type"];
    if (typeof t === "string") out.push(t);
    else if (Array.isArray(t)) out.push(...t.filter((x): x is string => typeof x === "string"));
    const graph = (node as Record<string, unknown>)["@graph"];
    if (graph) typesOf(graph, out);
  }
}

const len = (s: string) => [...s].length;

export function analyzeHtml(html: string, pageUrl: string): Health {
  const checks: Check[] = [];
  const add = (label: string, level: Level, detail: string) => checks.push({ label, level, detail });

  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const tl = len(title);
  add("כותרת (title)", !title ? "bad" : tl < 25 || tl > 65 ? "warn" : "ok", title ? `${tl} תווים${tl > 65 ? ": ארוכה, גוגל עלול לקצר (עד כ־60)" : tl < 25 ? ": קצרה, אפשר לנצל יותר" : ""}` : "אין כותרת");

  const description = metaContent(html, "description") ?? "";
  const dl = len(description);
  add("תיאור (meta description)", !description ? "bad" : dl < 70 || dl > 170 ? "warn" : "ok", description ? `${dl} תווים${dl > 170 ? ": ארוך, ייחתך (עד כ־160)" : dl < 70 ? ": קצר, כדאי 120–160" : ""}` : "אין תיאור");

  const robots = (metaContent(html, "robots") ?? "").toLowerCase();
  add("אינדוקס", robots.includes("noindex") ? "warn" : "ok", robots.includes("noindex") ? "הדף מסומן noindex: לא יופיע בגוגל" : "פתוח לאינדוקס");

  const canonical = linkHref(html, "canonical")[0] ?? "";
  let canonicalOk = false;
  try {
    canonicalOk = !!canonical && new URL(canonical, pageUrl).pathname === new URL(pageUrl).pathname;
  } catch {}
  add("כתובת קנונית", !canonical ? "warn" : canonicalOk ? "ok" : "warn", !canonical ? "אין canonical" : canonicalOk ? "מצביעה על הדף עצמו" : `מצביעה על דף אחר: ${canonical}`);

  const h1 = html.match(/<h1\b/gi)?.length ?? 0;
  add("כותרת ראשית (H1)", h1 === 1 ? "ok" : h1 === 0 ? "bad" : "warn", h1 === 1 ? "אחת, כמו שצריך" : h1 === 0 ? "אין H1" : `${h1} כותרות H1: עדיף אחת`);

  const h2 = html.match(/<h2\b/gi)?.length ?? 0;
  add("כותרות משנה (H2)", h2 > 0 ? "ok" : "warn", h2 > 0 ? `${h2} כותרות` : "אין כותרות משנה: קשה יותר לסרוק את הדף");

  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const noAlt = imgs.filter((t) => attr(t, "alt") === null).length;
  const emptyAlt = imgs.filter((t) => attr(t, "alt") === "").length;
  add("טקסט חלופי לתמונות", noAlt ? "bad" : "ok", `${imgs.length} תמונות${noAlt ? `, ${noAlt} בלי alt` : ""}${emptyAlt ? `, ${emptyAlt} דקורטיביות (alt ריק)` : ""}`);

  const ogImage = metaContent(html, "og:image");
  const ogTitle = metaContent(html, "og:title");
  add("תצוגה בשיתוף (Open Graph)", ogImage && ogTitle ? "ok" : "warn", [ogTitle ? "כותרת ✓" : "אין og:title", ogImage ? "תמונה ✓" : "אין og:image"].join(" · "));

  const hreflang = (html.match(/<link\b[^>]*hreflang=[^>]*>/gi) ?? []).length;
  add("גרסאות שפה (hreflang)", hreflang ? "ok" : "warn", hreflang ? `${hreflang} קישורים` : "אין: בסדר לדף בשפה אחת בלבד");

  const jsonLdTypes: string[] = [];
  let jsonLdBroken = 0;
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      typesOf(JSON.parse(m[1]), jsonLdTypes);
    } catch {
      jsonLdBroken++;
    }
  }
  add("נתונים מובנים (JSON-LD)", jsonLdBroken ? "bad" : jsonLdTypes.length ? "ok" : "warn", jsonLdBroken ? `${jsonLdBroken} בלוקים שבורים` : jsonLdTypes.length ? [...new Set(jsonLdTypes)].join(", ") : "אין");
  const hasBusiness = jsonLdTypes.some((t) => /Business|Organization/.test(t));
  add("ישות העסק (Organization)", hasBusiness ? "ok" : "warn", hasBusiness ? "מופיעה: מנועי AI יודעים מי העסק" : "לא מופיעה");
  const faq = jsonLdTypes.includes("FAQPage");
  add("שאלות ותשובות (FAQPage)", faq ? "ok" : "warn", faq ? "יש: מקור טוב לתשובות AI" : "אין: אפשר להוסיף שאלות לדף בעורך הדף");

  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
  const text = decode(main.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const words = text ? text.split(" ").length : 0;
  add("כמות תוכן", words >= 300 ? "ok" : words >= 120 ? "warn" : "bad", `כ־${words} מילים בתוכן הדף${words < 300 ? ": דפים עם יותר תוכן ענייני מצוטטים יותר" : ""}`);

  let host = "";
  try {
    host = new URL(pageUrl).host;
  } catch {}
  const links = [...main.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const internal = links.filter((h) => h.startsWith("/") || (host && h.includes(host))).length;
  add("קישורים פנימיים", internal >= 3 ? "ok" : "warn", `${internal} קישורים לדפים אחרים באתר`);

  const weights: Record<Level, number> = { ok: 1, warn: 0.5, bad: 0 };
  const score = Math.round((checks.reduce((s, c) => s + weights[c.level], 0) / checks.length) * 100);
  return { checks, score, title, description, jsonLdTypes: [...new Set(jsonLdTypes)] };
}
