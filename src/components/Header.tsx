"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/lib/cart-store";
import { site } from "@/lib/catalog";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { useHydrated } from "@/lib/use-hydrated";

const NAV = [
  { href: "/shop/", label: "קטלוג מחסנים" },
  { href: "/gallery/", label: "גלריה וסרטונים" },
  { href: "/faq/", label: "שאלות נפוצות" },
  { href: "/about/", label: "אודות" },
  { href: "/contact/", label: "צור קשר" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mounted = useHydrated();
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState(pathname);
  // close the mobile menu after navigating
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }
  const items = useCart((s) => s.items);
  const lastAdded = useCart((s) => s.lastAdded);
  const count = items.reduce((n, i) => n + i.qty, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // while the menu is open the page behind it must not scroll
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = overflow;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-white transition-colors duration-300 ${scrolled ? "border-line" : "border-transparent"}`}
    >
      <div className="container-x flex h-16 items-center gap-3 lg:h-[72px]">
        <button
          className="-ms-2 grid size-11 place-items-center rounded-full lg:hidden"
          aria-label="פתיחת תפריט"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" className="size-6" />
        </button>
        <Link href="/" className="shrink-0" aria-label="מודובוקס – דף הבית">
          <Logo className="h-7 w-auto lg:h-8" />
        </Link>
        <nav className="ms-6 hidden items-center gap-1 lg:flex" aria-label="ניווט ראשי">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-3.5 py-2 text-[15px] font-semibold transition hover:bg-sand ${
                pathname?.startsWith(n.href) ? "text-brand-dark" : "text-ink/80"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <a href={`tel:${site.phone}`} className="hidden items-center gap-2 rounded-full px-3 py-2 text-[15px] font-bold sm:flex hover:bg-sand" dir="ltr">
            <Icon name="phone" className="size-4 text-brand-dark" />
            {site.phone}
          </a>
          <a href={`tel:${site.phone}`} className="grid size-11 place-items-center rounded-full bg-sand sm:hidden" aria-label="חייגו אלינו">
            <Icon name="phone" className="size-5" />
          </a>
          <Link href="/cart/" className="relative grid size-11 place-items-center rounded-full bg-ink text-white" aria-label={`סל הקניות${mounted && count ? `, ${count} פריטים` : ""}`}>
            <Icon name="cart" className="size-5" />
            <AnimatePresence>
              {mounted && count > 0 && (
                <motion.span
                  key={lastAdded}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: [1.4, 1], opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-xs font-bold text-white ring-2 ring-white"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </div>

      {/* The menu is portalled to <body>: inside the sticky header it would be
          clipped to the header's box and the page would show through. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.nav
                id="mobile-menu"
                className="fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain bg-white lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                aria-label="תפריט"
              >
                <div className="container-x flex h-16 shrink-0 items-center justify-between border-b border-line">
                  <Logo className="h-7 w-auto" />
                  <button className="-me-2 grid size-11 place-items-center rounded-full" onClick={() => setOpen(false)} aria-label="סגירת תפריט">
                    <Icon name="close" className="size-6" />
                  </button>
                </div>
                <div className="container-x flex flex-1 flex-col py-4">
                  {[{ href: "/", label: "דף הבית" }, ...NAV, { href: "/cart/", label: "סל הקניות" }].map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className={`border-b border-line py-4 text-xl font-bold ${pathname === n.href ? "text-brand-dark" : "text-ink"}`}
                    >
                      {n.label}
                    </Link>
                  ))}
                  <div className="mt-auto grid gap-3 pt-8">
                    <a href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(site.whatsappGreeting)}`} className="btn-wa w-full py-4" target="_blank" rel="noopener">
                      <Icon name="whatsapp" /> דברו איתנו בוואטסאפ
                    </a>
                    <a href={`tel:${site.phone}`} className="btn-ghost w-full py-4">
                      <Icon name="phone" /> <span dir="ltr">{site.phone}</span>
                    </a>
                  </div>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </header>
  );
}
