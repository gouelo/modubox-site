import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, readSessionToken, sessionSecret } from "@/lib/admin/auth";
import { redirectRules } from "@/lib/seo/redirect-cache";
import { findRedirect } from "@/lib/seo/redirects";

/**
 * Two jobs, only on a server build (Vercel): the GitHub Pages export has no
 * admin and no redirects.
 *
 * 1. Locks the admin (/admin, /api/admin): customer data, never public.
 *    Without a valid session cookie a page goes to the sign-in page and an
 *    API call gets 401.
 * 2. The site's permanent redirects (the old Wix addresses and the admin's
 *    own): src/lib/seo/redirects.ts. Next.js has already added the trailing
 *    slash (308) by the time a request gets here.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin")) return admin(req);
  const hit = findRedirect(await redirectRules(), pathname, search);
  if (!hit) return NextResponse.next();
  return NextResponse.redirect(new URL(hit.location, req.url), hit.status);
}

async function admin(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const open = pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  const session = open ? null : await readSessionToken(sessionSecret(), req.cookies.get(ADMIN_COOKIE)?.value);
  let res: NextResponse;
  if (open || session) res = NextResponse.next();
  else if (pathname.startsWith("/api/")) res = NextResponse.json({ error: "unauthorized" }, { status: 401 });
  else {
    const login = new URL("/admin/login/", req.url);
    if (pathname !== "/admin" && pathname !== "/admin/") login.searchParams.set("next", pathname + search);
    res = NextResponse.redirect(login);
  }
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "same-origin");
  return res;
}

export const config = {
  // every page address (for the redirects) and the admin's API; not Next's
  // files, the site's images and assets, or the public API (checkout)
  matcher: ["/((?!_next/|_img/|images/|brand/|cta/|clients/|api/|.*\\.[A-Za-z0-9]{2,5}$).*)", "/api/admin", "/api/admin/:path*"],
};
