"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/", label: "ראשי", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" },
  { href: "/admin/orders/", label: "הזמנות", icon: "M6 3h12a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2-3-2V4a1 1 0 0 1 1-1Zm3 5h6m-6 4h6m-6 4h4" },
  { href: "/admin/customers/", label: "לקוחות", icon: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m6.5-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.87M15 3.13a3.5 3.5 0 0 1 0 6.74" },
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
export function AdminNav() {
  const path = usePathname();
  return (
    <>
      <nav aria-label="ניהול" className="hidden items-center gap-1 md:flex">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={active(path, l.href) ? "page" : undefined} className={`rounded-full px-4 py-2 text-[15px] font-semibold transition ${active(path, l.href) ? "bg-white text-ink" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
      <nav aria-label="ניהול" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-3">
          {LINKS.map((l) => (
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
