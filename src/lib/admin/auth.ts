/**
 * The admin's sign-in, for now one password (ADMIN_PASSWORD in Vercel's
 * environment) and a signed, httpOnly cookie. Web Crypto only, so the same
 * code runs in the proxy (src/proxy.api.ts) and on the server.
 *
 * Built to be replaced: the cookie carries a user and a role, and every page
 * and action asks `can(session, permission)`. A real login (users in the
 * database, or Google sign-in) only has to issue the same session; the roles
 * and their permissions are below (docs/admin-spec.md, roles).
 *
 * Without ADMIN_PASSWORD the admin is locked: nobody can sign in.
 */

export const ADMIN_COOKIE = "mbx_admin";
export const SESSION_DAYS = 30;

/**
 * owner: everything. manager: the day-to-day work (orders, customers, leads,
 * catalog, coupons, content), not the site's settings (docs/admin-spec.md).
 * content: SEO and content only, never orders, customers or leads.
 */
export type Role = "owner" | "manager" | "content";
export type Permission = "orders" | "customers" | "leads" | "export" | "content" | "catalog" | "coupons" | "site";

export const ALL_PERMISSIONS: Permission[] = ["orders", "customers", "leads", "export", "content", "catalog", "coupons", "site"];

const PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL_PERMISSIONS,
  manager: ["orders", "customers", "leads", "export", "content", "catalog", "coupons"],
  content: ["content"],
};

export interface AdminSession {
  /** who: "admin" while there is one shared password */
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
export async function createSessionToken(secret: string, user: string, role: Role, now = Date.now()): Promise<string> {
  const session: AdminSession = { user, role, exp: Math.floor(now / 1000) + SESSION_DAYS * 86_400 };
  const payload = b64url(enc.encode(JSON.stringify(session)));
  return `v1.${payload}.${b64url(await hmac(secret, `v1.${payload}`))}`;
}

/** The session in a cookie, or null if it is missing, forged, expired or the admin is locked. */
export async function readSessionToken(secret: string | null, token: string | undefined, now = Date.now()): Promise<AdminSession | null> {
  if (!secret || !token) return null;
  const [v, payload, sig] = token.split(".");
  if (v !== "v1" || !payload || !sig) return null;
  try {
    if (!sameBytes(await hmac(secret, `v1.${payload}`), fromB64url(sig))) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as AdminSession;
    if (typeof s.exp !== "number" || s.exp * 1000 < now || !(s.role in PERMISSIONS) || typeof s.user !== "string") return null;
    return s;
  } catch {
    return null;
  }
}

/** Whether a typed password is ADMIN_PASSWORD (compared in constant time). */
export async function checkPassword(input: string, env: Env = process.env): Promise<boolean> {
  const password = env.ADMIN_PASSWORD?.trim();
  if (!password || !input) return false;
  // HMAC both with one key: equal lengths, so the comparison leaks nothing
  return sameBytes(await hmac("modubox-admin-password", input.trim()), await hmac("modubox-admin-password", password));
}

/** Where to go after signing in: only a page of the admin. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/admin(\/[\w\-./%?=&]*)?$/.test(next) && !next.startsWith("/admin/login") && !next.includes("//") ? next : "/admin/";
}
