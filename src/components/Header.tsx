"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/lib/cart-store";
import { site } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { useHydrated } from "@/lib/use-hydrated";
import { useDialog } from "@/lib/use-dialog";
import { lp } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { LangSwitch } from "./LangSwitch";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mounted = useHydrated();
  const locale = useLocale();
  const t = useT();
  const raw = usePathname() ?? "/";
  /** the path with a trailing slash, as the links are written */
  const pathname = raw.endsWith("/") ? raw : `${raw}/`;
  const NAV = t.header.nav.map((n) => ({ ...n, href: lp(locale, n.href) }));
  const home = lp(locale, "/");
  const menuRef = useRef<HTMLDivElement>(null);
  useDialog(menuRef, open, () => setOpen(false));
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
    return () => {
      document.documentElement.style.overflow = overflow;
      document.body.style.overflow = "";
    };
  }, [open]);

  // on the home page the header floats over the hero until you scroll
  const overHero = pathname === home && !scrolled;

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-[background-color,border-color,color] duration-500 ${
        overHero ? "border-transparent bg-transparent text-white" : `bg-white/90 text-ink backdrop-blur-xl ${scrolled ? "border-line" : "border-transparent"}`
      }`}
    >
      <div className="container-wide flex h-16 items-center gap-3 lg:h-[72px]">
        <button
          className="-ms-2 grid size-11 place-items-center rounded-full lg:hidden"
          aria-label={t.header.openMenu}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" className="size-6" />
        </button>
        <Link href={home} className="shrink-0" aria-label={t.header.logoHome}>
          <Logo white={overHero} alt="" className="h-7 w-auto lg:h-8" />
        </Link>
        <nav className="ms-3 hidden items-center gap-0.5 lg:flex xl:ms-6 xl:gap-1" aria-label={t.header.mainNav}>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname.startsWith(n.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-2.5 py-2 text-[15px] font-semibold transition xl:px-3.5 ${
                overHero ? "text-white/90 hover:bg-white/10" : pathname.startsWith(n.href) ? "text-brand-dark hover:bg-sand" : "text-ink/85 hover:bg-sand"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LangSwitch className={overHero ? "hover:bg-white/10" : "hover:bg-sand"} />
          <a href={`tel:${site.phone}`} className={`hidden items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-bold sm:flex ${overHero ? "hover:bg-white/10" : "hover:bg-sand"}`} dir="ltr">
            <Icon name="phone" className={`size-4 ${overHero ? "text-glow" : "text-brand-dark"}`} />
            {site.phone}
          </a>
          <a href={`tel:${site.phone}`} className={`grid size-11 place-items-center rounded-full transition-colors max-[379px]:hidden sm:hidden ${overHero ? "bg-white/15 backdrop-blur" : "bg-sand"}`} aria-label={t.header.callUs}>
            <Icon name="phone" className="size-5" />
          </a>
          <Link href={lp(locale, "/cart/")} className={`relative grid size-11 place-items-center rounded-full transition-colors ${overHero ? "bg-white text-ink" : "bg-ink text-white"}`} aria-label={t.header.cartAria(mounted ? count : 0)}>
            <Icon name="cart" className="size-5" />
            <AnimatePresence>
              {mounted && count > 0 && (
                <motion.span
                  key={lastAdded}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: [1.4, 1], opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-brand-dark px-1 text-xs font-bold text-white ring-2 ring-white"
                  aria-hidden="true"
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
              <motion.div
                ref={menuRef}
                id="mobile-menu"
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain bg-white lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                aria-label={t.header.menu}
              >
                <div className="container-x flex h-16 shrink-0 items-center justify-between border-b border-line">
                  <Logo alt={t.logoAlt} className="h-7 w-auto" />
                  <button className="-me-2 grid size-11 place-items-center rounded-full" onClick={() => setOpen(false)} aria-label={t.header.closeMenu}>
                    <Icon name="close" className="size-6" />
                  </button>
                </div>
                <nav className="container-x flex flex-1 flex-col py-4" aria-label={t.header.mainNav}>
                  {[{ href: home, label: t.header.home }, ...NAV, { href: lp(locale, "/cart/"), label: t.header.cart }].map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      aria-current={pathname === n.href ? "page" : undefined}
                      className={`border-b border-line py-4 text-xl font-bold ${pathname === n.href ? "text-brand-dark" : "text-ink"}`}
                    >
                      {n.label}
                    </Link>
                  ))}
                  <LangSwitch big className="mt-4 self-start border border-line hover:bg-sand" />
                  <div className="mt-auto grid gap-3 pt-8">
                    <a href={waLink(t.whatsapp.greeting)} className="btn-wa w-full py-4" target="_blank" rel="noopener">
                      <Icon name="whatsapp" /> {t.header.waCta}
                    </a>
                    <a href={`tel:${site.phone}`} className="btn-ghost w-full py-4">
                      <Icon name="phone" /> <span dir="ltr">{site.phone}</span>
                    </a>
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </header>
  );
}
