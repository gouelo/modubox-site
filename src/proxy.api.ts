import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, readSessionToken, sessionSecret } from "@/lib/admin/auth";

/**
 * Locks the admin (/admin, /api/admin): customer data, never public. Without
 * a valid session cookie a page goes to the sign-in page and an API call gets
 * 401. Only on a server build (Vercel): the GitHub Pages export has no admin.
 */
export async function proxy(req: NextRequest) {
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
  matcher: ["/admin", "/admin/:path*", "/api/admin", "/api/admin/:path*"],
};
