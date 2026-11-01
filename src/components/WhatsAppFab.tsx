"use client";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useLocale, useT } from "@/i18n/client";
import { catalog } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";

/** The floating WhatsApp button, on every page. */
export function WhatsAppFab() {
  const pathname = usePathname() ?? "";
  const locale = useLocale();
  const t = useT();
  // product pages, the cart and checkout have their own WhatsApp button
  if (/^(\/en)?\/(product|cart|checkout)/.test(pathname)) return null;
  const site = catalog(locale).site;
  return (
    <motion.a
      href={waLink(site.whatsappGreeting)}
      target="_blank"
      rel="noopener"
      aria-label={t.fab.aria}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 18 }}
      className="group fixed bottom-4 end-4 z-40 flex items-center gap-2 rounded-full bg-wa-dark p-3.5 text-white shadow-lift sm:bottom-6 sm:end-6"
    >
      <Icon name="whatsapp" className="size-7" />
      <span className="hidden pe-1 text-[15px] font-bold text-white sm:inline">{t.fab.label}</span>
    </motion.a>
  );
}
