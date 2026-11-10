import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, readSessionToken, sessionSecret } from "@/lib/admin/auth";
import { redirectRules } from "@/lib/seo/redirect-cache";
import { englishHostRedirect, routeRequest } from "@/lib/seo/redirects";

/**
 * Two jobs, only on a server build (Vercel): the GitHub Pages export has no
 * admin and no redirects.
 *
 * 1. Locks the admin (/admin, /api/admin): customer data, never public.
 *    Without a valid session cookie a page goes to the sign-in page and an
 *    API call gets 401.
 * 2. The site's permanent redirects (the old Wix addresses and the admin's
 *    own) and the trailing slash, in one hop: src/lib/seo/redirects.ts
 *    routeRequest. Next.js's own slash redirect is off on the server
 *    (next.config skipTrailingSlashRedirect), or every old address would take
 *    two hops (308 to add the slash, then 301).
 * 3. The old English subdomain (en.modubox.com) goes to the English site on
 *    www (/en/…), path kept, in that same single hop.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const en = englishHostRedirect(await redirectRules(), req.headers.get("host"), pathname, search);
  if (en) return NextResponse.redirect(en.location, en.status);
  const to = routeRequest(await redirectRules(), pathname, search);
  if (to) return NextResponse.redirect(new URL(to.location, req.url), to.status);
  if (pathname === "/admin/" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin")) return admin(req);
  return NextResponse.next();
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
  // every page and API address (the redirects and the trailing slash, which
  // Next.js no longer adds itself); not Next's files, the site's images and assets
  matcher: ["/((?!_next/|_img/|images/|brand/|cta/|clients/|.*\\.[A-Za-z0-9]{2,5}$).*)"],
};
