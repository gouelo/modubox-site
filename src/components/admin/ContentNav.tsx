"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const CONTENT_LINKS = [
  { href: "/admin/content/", label: "סקירה" },
  { href: "/admin/content/pages/", label: "דפים ו־SEO" },
  { href: "/admin/content/blog/", label: "בלוג" },
  { href: "/admin/content/redirects/", label: "הפניות" },
  { href: "/admin/content/business/", label: "פרטי העסק" },
  { href: "/admin/content/llms/", label: "llms.txt" },
  { href: "/admin/content/crawlers/", label: "סורקי AI" },
  { href: "/admin/content/sitemap/", label: "Sitemap" },
  { href: "/admin/content/health/", label: "בדיקת דף" },
];

/** The content module's sections, a scrolling row of pills (phone first). */
export function ContentNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/admin/content/" ? path === href || path === "/admin/content" : path.startsWith(href) || (href.endsWith("/pages/") && path.startsWith("/admin/content/page/")));
  return (
    <nav aria-label="תוכן" className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
      {CONTENT_LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${active(l.href) ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink/40"}`}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
