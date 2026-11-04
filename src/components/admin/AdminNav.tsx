"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Permission } from "@/lib/admin/auth";

const LINKS: { href: string; label: string; icon: string; perm: Permission }[] = [
  { href: "/admin/", perm: "orders", label: "ראשי", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" },
  { href: "/admin/orders/", perm: "orders", label: "הזמנות", icon: "M6 3h12a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2-3-2V4a1 1 0 0 1 1-1Zm3 5h6m-6 4h6m-6 4h4" },
  { href: "/admin/customers/", perm: "customers", label: "לקוחות", icon: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m6.5-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.87M15 3.13a3.5 3.5 0 0 1 0 6.74" },
  { href: "/admin/leads/", perm: "customers", label: "לידים", icon: "M4 6h16v12H4zM4 7l8 6 8-6" },
  { href: "/admin/catalog/", perm: "catalog", label: "קטלוג", icon: "M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Zm0 0 8 4.5m0 0 8-4.5M12 12v9" },
  { href: "/admin/coupons/", perm: "coupons", label: "קופונים", icon: "M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Zm5-4.5h.01" },
  { href: "/admin/site/", perm: "site", label: "אתר", icon: "M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5Zm0 4h18M7 13h6m-6 3h4" },
  { href: "/admin/content/", perm: "content", label: "תוכן", icon: "M4 5h16M4 10h16M4 15h10M4 20h7m9-4-4 4-2-2" },
];

function active(path: string, href: string) {
  return href === "/admin/" ? path === "/admin/" || path === "/admin" : path.startsWith(href);
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Desktop: links in the top bar. Phone: a tab bar at the bottom, in thumb's reach. */
export function AdminNav({ perms }: { perms: Permission[] }) {
  const path = usePathname();
  const links = LINKS.filter((l) => perms.includes(l.perm));
  return (
    <>
      <nav aria-label="ניהול" className="hidden items-center gap-1 md:flex">
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={active(path, l.href) ? "page" : undefined} className={`rounded-full px-4 py-2 text-[15px] font-semibold transition ${active(path, l.href) ? "bg-white text-ink" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
      <nav aria-label="ניהול" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={active(path, l.href) ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold ${active(path, l.href) ? "text-brand-dark" : "text-ink-soft"}`}>
                <Icon d={l.icon} />
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
