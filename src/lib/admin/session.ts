import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, can, homeFor, readSessionToken, sessionSecret, type AdminSession, type Permission } from "./auth";

/**
 * The signed-in admin, on the server (pages, server actions, routes). The
 * proxy already turned away anyone without a session; these check again, so
 * nothing in the admin relies on the proxy alone.
 */
export async function getSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  return readSessionToken(sessionSecret(), jar.get(ADMIN_COOKIE)?.value);
}

/** The session, or off to the sign-in page. With a permission: only someone who has it. */
export async function requireAdmin(permission?: Permission): Promise<AdminSession> {
  const s = await getSession();
  if (!s) redirect("/admin/login/");
  // someone without it goes to their own start page (the content role: the content module)
  if (permission && !can(s, permission)) redirect(homeFor(s));
  return s;
}
