"use client";
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocale, useT } from "@/i18n/client";
import { getProduct, site } from "@/lib/catalog";
import { design3dLink, hasDesign3d } from "@/lib/design3d";
import { asset } from "@/lib/paths";
import { useHydrated } from "@/lib/use-hydrated";
import { Icon } from "./Icon";

const DISMISSED = "modubox:floating-cta-dismissed";
const noop = () => () => {};
const wasDismissed = () => {
  try {
    return !!sessionStorage.getItem(DISMISSED);
  } catch {
    return false; // storage blocked: show it
  }
};

/** A slow drift (7s) and, out of step with it, a small hop every 9s so the eye catches it. */
const drift = {
  x: [0, 5, 0, -5, 0],
  y: [0, -7, -2, -5, 0],
  rotate: [0, 1.2, 0, -1.2, 0],
  transition: { duration: 7, repeat: Infinity, ease: "easeInOut" as const },
} satisfies TargetAndTransition;
const shadow = {
  scaleX: [1, 0.82, 0.95, 0.86, 1],
  opacity: [0.32, 0.2, 0.28, 0.22, 0.32],
  transition: { duration: 7, repeat: Infinity, ease: "easeInOut" as const },
} satisfies TargetAndTransition;
const nudge = {
  y: [0, 0, -12, 0, -4, 0],
  rotate: [0, 0, -4, 3, -1, 0],
  transition: { duration: 9, times: [0, 0.04, 0.09, 0.13, 0.16, 1], repeat: Infinity, ease: "easeInOut" as const, delay: 2.5 },
} satisfies TargetAndTransition;

/**
 * Experiment (Nov 2026): a little shed floating in the bottom corner that
 * invites people to design theirs in the 3D configurator. It sits opposite
 * the WhatsApp button, links to the configurator (ConfiguratorPanel opens it
 * in the side panel; on a product page, on that product's size), and stays
 * off the cart and checkout, and away from the footer. On a product page it
 * sits above the phone's "add to cart" bar, level with the call button.
 * ✕ hides it for the session, which is also what stops its motion
 * (WCAG 2.2.2); with reduced
 * motion it does not move at all. To remove it: data/site.json →
 * floatingConfiguratorCta: false, or delete this file and its line in SiteShell.
 */
export function FloatingConfiguratorCta() {
  const pathname = usePathname() ?? "";
  const locale = useLocale();
  const t = useT().floatingCta;
  const still = useReducedMotion();
  const hydrated = useHydrated();
  const [dismissed, setDismissed] = useState(false);
  const dismissedBefore = useSyncExternalStore(noop, wasDismissed, () => false);
  const [footer, setFooter] = useState(false);

  // step aside while the footer is on screen, so it never covers its links
  useEffect(() => {
    const el = document.querySelector("footer");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setFooter(e.isIntersecting), { rootMargin: "0px 0px -40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [pathname]);

  if (!site.floatingConfiguratorCta || !hasDesign3d()) return null;
  if (/^(\/en)?\/(cart|checkout)/.test(pathname)) return null;
  const slug = /^(?:\/en)?\/product\/([^/]+)/.exec(pathname)?.[1];
  const product = slug ? getProduct(slug, locale) : undefined;
  if (slug && (!product || !hasDesign3d(product))) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED, "1");
    } catch {
      /* fine: hidden until the next page load */
    }
    document.getElementById("main")?.focus({ preventScroll: true });
  };

  const show = hydrated && !dismissed && !dismissedBefore && !footer;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="floating-cta"
          initial={still ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, ...(still ? {} : { y: 30, scale: 0.9 }), transition: { duration: 0.25 } }}
          transition={{ delay: footer ? 0 : 1.2, type: "spring", stiffness: 220, damping: 22 }}
          className={`fixed start-2 z-40 sm:start-5 ${slug ? "bottom-24 lg:bottom-5" : "bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-5"}`}
        >
          <motion.a
            href={design3dLink(product)}
            target="_blank"
            rel="noopener"
            whileHover={still ? undefined : { y: -4, scale: 1.04 }}
            whileTap={still ? undefined : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="group flex items-end rounded-2xl"
          >
            <span className="relative z-10 w-[76px] shrink-0 sm:w-[104px]">
              {/* a soft teal halo, so the white shed stands out on photos too */}
              <span aria-hidden className="absolute inset-x-1 top-1/4 bottom-1 rounded-full bg-brand/30 blur-xl" />
              <motion.span aria-hidden className="relative block" animate={still ? undefined : drift}>
                <motion.img
                  src={asset("/cta/shed-3d.webp")}
                  alt=""
                  width={320}
                  height={283}
                  draggable={false}
                  animate={still ? undefined : nudge}
                  className="block h-auto w-full drop-shadow-[0_6px_8px_rgb(10_21_23/0.22)]"
                />
              </motion.span>
              {/* the shadow on the ground shrinks as the shed rises */}
              <motion.span
                aria-hidden
                animate={still ? undefined : shadow}
                className="relative mx-auto mt-0.5 block h-2 w-3/4 rounded-[50%] bg-ink/30 blur-[3px]"
              />
            </span>
            <span className="relative -ms-3 mb-3 flex flex-col rounded-2xl bg-ink py-2 ps-5 pe-4 text-white shadow-lift ring-1 ring-white/15 transition-colors duration-300 group-hover:bg-petrol sm:mb-5 sm:py-2.5 sm:pe-5">
              <span className="max-w-[8.5rem] text-[14px] font-extrabold leading-tight sm:max-w-none sm:text-[15px]">{t.label}</span>
              <span className="mt-0.5 hidden items-center gap-1 text-[12px] font-medium text-white/75 sm:flex">
                <Icon name="cube" className="size-3.5 text-brand" />
                {t.sub}
              </span>
            </span>
          </motion.a>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t.dismiss}
            className="absolute -top-2 end-[-0.4rem] z-20 grid size-7 place-items-center rounded-full border border-line bg-white text-ink/70 shadow-soft transition hover:text-ink"
          >
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
