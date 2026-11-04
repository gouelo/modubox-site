"use client";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useLocale, useT } from "@/i18n/client";
import { catalog } from "@/lib/catalog";
import { Icon } from "./Icon";

/**
 * The floating call button, on every page: stacked above the WhatsApp button,
 * or, where that one is hidden (product pages, cart, checkout), in its place,
 * above the mobile "add to cart" / "checkout" bar. A tel: link, so it pushes
 * phone_click (src/components/Analytics.tsx).
 */
export function CallFab() {
  const pathname = usePathname() ?? "";
  const locale = useLocale();
  const t = useT();
  const site = catalog(locale).site;
  const alone = /^(\/en)?\/(product|cart|checkout)/.test(pathname);
  const place = alone ? "bottom-24 sm:bottom-24 lg:bottom-6" : "bottom-[5.25rem] sm:bottom-[6.75rem]";
  return (
    <motion.a
      href={`tel:${site.phone}`}
      aria-label={t.fab.callAria(site.phone)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.95, type: "spring", stiffness: 260, damping: 18 }}
      className={`group fixed end-4 z-40 flex items-center gap-2 rounded-full bg-ink p-3.5 text-white shadow-lift sm:end-6 ${place}`}
    >
      <Icon name="phone" className="size-7" />
      <span className="hidden pe-1 text-[15px] font-bold text-white sm:inline" dir="ltr">{site.phone}</span>
    </motion.a>
  );
}
