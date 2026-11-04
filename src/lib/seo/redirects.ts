import { compile, pathToRegexp, type Key } from "path-to-regexp";
import oldSite from "../../../data/redirects.json";

/**
 * Permanent redirects, answered by the proxy (src/proxy.api.ts): the old Wix
 * addresses in data/redirects.json, with the admin's table on top (Content →
 * redirects; table redirects). A row with the source of a file entry replaces
 * it, or turns it off (enabled=false); other rows add redirects. When the
 * database can't be read, the file's redirects still work.
 *
 * Sources are written decoded and without the trailing slash ("/post/מחסן",
 * "/post/:slug*"), matched like next.config redirects: case-insensitive,
 * ":name*" for any rest of the path; the query string is kept.
 */
export interface RedirectRule {
  source: string;
  destination: string;
  statusCode: number;
  enabled: boolean;
  /** from data/redirects.json, or the admin's */
  origin: "file" | "admin";
  note?: string | null;
  kind?: string | null;
  id?: number;
}

export interface CompiledRule extends RedirectRule {
  re: RegExp;
  keys: Key[];
}

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** "/Post/מחסן/" → "/Post/מחסן": how sources are stored and requests matched. */
export function normalizeSource(path: string): string {
  let p = safeDecode(path.trim()).replace(/[?#].*$/, "");
  if (!p.startsWith("/")) p = `/${p}`;
  return p.length > 1 ? p.replace(/\/+$/, "") || "/" : p;
}

/** A destination as it goes in the Location header: Hebrew percent-encoded, full URLs as they are. */
export function encodeDestination(dest: string): string {
  if (/^https?:\/\//i.test(dest)) return dest;
  const [path, query] = dest.split(/\?([^]*)/, 2);
  const enc = path
    .split("/")
    .map((seg) => encodeURIComponent(safeDecode(seg)))
    .join("/");
  return query ? `${enc}?${query}` : enc;
}

export function fileRules(): RedirectRule[] {
  return oldSite.map((r) => ({ source: normalizeSource(r.source), destination: r.destination, statusCode: 301, enabled: true, origin: "file" as const, note: r.note, kind: r.kind }));
}

export interface RedirectRowLike {
  id?: number;
  source: string;
  destination: string;
  statusCode: number;
  enabled: boolean;
  note?: string | null;
  kind?: string | null;
}

/** The file's redirects with the admin's rows on top, exact addresses before patterns (so a pattern never hides one). */
export function mergeRules(file: RedirectRule[], rows: RedirectRowLike[]): RedirectRule[] {
  const key = (s: string) => normalizeSource(s).toLowerCase();
  const byRow = new Map(rows.map((r) => [key(r.source), r]));
  const merged: RedirectRule[] = file.map((f) => {
    const r = byRow.get(key(f.source));
    if (!r) return f;
    byRow.delete(key(f.source));
    return { ...f, destination: r.destination, statusCode: r.statusCode, enabled: r.enabled, origin: "admin", note: r.note ?? f.note, id: r.id };
  });
  for (const r of byRow.values()) merged.push({ source: normalizeSource(r.source), destination: r.destination, statusCode: r.statusCode, enabled: r.enabled, origin: "admin", note: r.note, kind: r.kind, id: r.id });
  const isPattern = (r: RedirectRule) => /[:(*]/.test(r.source);
  return [...merged.filter((r) => !isPattern(r)), ...merged.filter(isPattern)];
}

export function compileRules(rules: RedirectRule[]): CompiledRule[] {
  const out: CompiledRule[] = [];
  for (const r of rules) {
    if (!r.enabled) continue;
    try {
      const keys: Key[] = [];
      const re = pathToRegexp(r.source, keys, { sensitive: false, strict: false });
      out.push({ ...r, re, keys });
    } catch (e) {
      console.error(`[redirects] skipped ${r.source}:`, e instanceof Error ? e.message : e);
    }
  }
  return out;
}

/** Where a request goes, or null. pathname as it arrives (percent-encoded), search with its "?". */
export function findRedirect(rules: CompiledRule[], pathname: string, search = ""): { location: string; status: number; rule: CompiledRule } | null {
  const path = normalizeSource(pathname);
  for (const rule of rules) {
    const m = rule.re.exec(path);
    if (!m) continue;
    let dest = rule.destination;
    if (/\/:/.test(dest) && !/^https?:/i.test(dest)) {
      const params: Record<string, string | string[]> = {};
      rule.keys.forEach((k, i) => {
        const v = m[i + 1];
        if (v !== undefined) params[k.name] = k.modifier === "*" || k.modifier === "+" ? v.split("/") : v;
      });
      try {
        dest = compile(dest, { validate: false })(params);
      } catch {}
    }
    let location = encodeDestination(dest);
    if (search && search !== "?") location += (location.includes("?") ? "&" : "?") + search.replace(/^\?/, "");
    return { location, status: rule.statusCode, rule };
  }
  return null;
}

/** For the admin: a rule's problems with the others (loops, chains). */
export function ruleWarnings(rules: RedirectRule[]): Map<string, string[]> {
  const compiled = compileRules(rules);
  const out = new Map<string, string[]>();
  for (const r of compiled) {
    if (/^https?:/i.test(r.destination)) continue;
    const next = findRedirect(compiled, encodeDestination(r.destination.replace(/:\w+[*+?]?/g, "x")));
    if (!next) continue;
    const msgs = out.get(r.source) ?? [];
    msgs.push(next.rule.source === r.source ? "מפנה לעצמו (לולאה)" : `שרשרת: היעד מופנה שוב אל ${safeDecode(next.location)}`);
    out.set(r.source, msgs);
  }
  return out;
}
