/**
 * The admin's sign-in: a password and a signed, httpOnly cookie.
 * ADMIN_PASSWORD (Vercel's environment) signs in the owner; SALES_PASSWORD,
 * if set, signs in the sales team (role `sales`). Web Crypto only, so the same
 * code runs in the proxy (src/proxy.api.ts) and on the server.
 *
 * Built to be replaced: the cookie carries a user and a role, and every page
 * and action asks `can(session, permission)`. A real login (users in the
 * database, or Google sign-in) only has to issue the same session; the roles
 * and their permissions are below (docs/admin-spec.md, roles).
 *
 * Without ADMIN_PASSWORD the admin is locked: nobody can sign in, the sales
 * team neither. Without SALES_PASSWORD there is no sales sign-in.
 */

export const ADMIN_COOKIE = "mbx_admin";
export const SESSION_DAYS = 30;

/**
 * owner: everything, deleting orders included. manager: the day-to-day work (orders, customers, leads,
 * catalog, coupons, content), not the site's settings (docs/admin-spec.md).
 * content: SEO and content only, never orders, customers or leads.
 * sales (Yoel, round 17): the sales team, signed in with SALES_PASSWORD: the home page (their version),
 * orders, customers, leads (deleting them too) and coupons. No stats, catalog, site, content or CSV export.
 */
export type Role = "owner" | "manager" | "content" | "sales";
export type Permission = "orders" | "delete_orders" | "customers" | "leads" | "delete_leads" | "export" | "stats" | "content" | "catalog" | "coupons" | "site";

export const ALL_PERMISSIONS: Permission[] = ["orders", "delete_orders", "customers", "leads", "delete_leads", "export", "stats", "content", "catalog", "coupons", "site"];

const PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL_PERMISSIONS,
  manager: ["orders", "customers", "leads", "export", "stats", "content", "catalog", "coupons"],
  content: ["content"],
  sales: ["orders", "customers", "leads", "delete_leads", "coupons"],
};

/** How each role is named in the admin's top bar. */
export const ROLE_LABEL: Record<Role, string> = { owner: "ניהול", manager: "ניהול", content: "תוכן", sales: "מכירות" };

export interface AdminSession {
  /** who: "admin" (the owner's password) or "sales" (the sales team's shared password) */
  user: string;
  role: Role;
  /** seconds since 1970 */
  exp: number;
}

export function can(s: AdminSession | null, p: Permission): boolean {
  return !!s && PERMISSIONS[s.role]?.includes(p);
}

type Env = Record<string, string | undefined>;

/** The signing secret, or null when the admin is locked (no ADMIN_PASSWORD). Changing the password signs everyone out. */
export function sessionSecret(env: Env = process.env): string | null {
  const password = env.ADMIN_PASSWORD?.trim();
  if (!password) return null;
  return `${env.ADMIN_SESSION_SECRET?.trim() ?? ""}|${password}`;
}

/**
 * The key a role's cookies are signed with. The sales team's also holds
 * SALES_PASSWORD, so changing (or removing) it signs out the sales team, and
 * only them; with no SALES_PASSWORD no sales cookie is valid.
 */
function roleSecret(secret: string, role: Role, env: Env): string | null {
  if (role !== "sales") return secret;
  const sales = env.SALES_PASSWORD?.trim();
  return sales ? `${secret}|sales|${sales}` : null;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** A session cookie's value: v1.<payload>.<signature>. */
export async function createSessionToken(secret: string, user: string, role: Role, now = Date.now(), env: Env = process.env): Promise<string> {
  const key = roleSecret(secret, role, env);
  if (!key) throw new Error(`no key for role ${role}`);
  const session: AdminSession = { user, role, exp: Math.floor(now / 1000) + SESSION_DAYS * 86_400 };
  const payload = b64url(enc.encode(JSON.stringify(session)));
  return `v1.${payload}.${b64url(await hmac(key, `v1.${payload}`))}`;
}

/** The session in a cookie, or null if it is missing, forged, expired or the admin is locked. */
export async function readSessionToken(secret: string | null, token: string | undefined, now = Date.now(), env: Env = process.env): Promise<AdminSession | null> {
  if (!secret || !token) return null;
  const [v, payload, sig] = token.split(".");
  if (v !== "v1" || !payload || !sig) return null;
  try {
    // the role picks the key, and the signature is checked before anything in the payload is trusted
    const s = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as AdminSession;
    if (!s || typeof s !== "object" || !Object.hasOwn(PERMISSIONS, s.role)) return null;
    const key = roleSecret(secret, s.role, env);
    if (!key || !sameBytes(await hmac(key, `v1.${payload}`), fromB64url(sig))) return null;
    if (typeof s.exp !== "number" || s.exp * 1000 < now || typeof s.user !== "string") return null;
    return s;
  } catch {
    return null;
  }
}

async function samePassword(input: string, password: string | undefined): Promise<boolean> {
  const p = password?.trim();
  if (!p || !input.trim()) return false;
  // HMAC both with one key: equal lengths, so the comparison leaks nothing
  return sameBytes(await hmac("modubox-admin-password", input.trim()), await hmac("modubox-admin-password", p));
}

/** Whether a typed password is ADMIN_PASSWORD (compared in constant time). */
export async function checkPassword(input: string, env: Env = process.env): Promise<boolean> {
  return samePassword(input, env.ADMIN_PASSWORD);
}

/**
 * Who a typed password signs in: the owner (ADMIN_PASSWORD), the sales team
 * (SALES_PASSWORD), or nobody. Nobody at all while the admin is locked; if
 * the two passwords are the same, it is the owner.
 */
export async function passwordRole(input: string, env: Env = process.env): Promise<{ user: string; role: Role } | null> {
  if (!sessionSecret(env)) return null;
  const [owner, sales] = await Promise.all([samePassword(input, env.ADMIN_PASSWORD), samePassword(input, env.SALES_PASSWORD)]);
  if (owner) return { user: "admin", role: "owner" };
  if (sales) return { user: "sales", role: "sales" };
  return null;
}

/** A role's start page: the home page for whoever sees orders, else the content module. */
export function homeFor(s: AdminSession | null): string {
  return can(s, "orders") ? "/admin/" : "/admin/content/";
}

/** Where to go after signing in: only a page of the admin. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/admin(\/[\w\-./%?=&]*)?$/.test(next) && !next.startsWith("/admin/login") && !next.includes("//") ? next : "/admin/";
}
