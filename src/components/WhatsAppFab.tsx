"use client";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { site } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";

/** The floating WhatsApp button, on every page. */
export function WhatsAppFab() {
  const pathname = usePathname() ?? "";
  // on mobile, product pages, the cart and checkout already show WhatsApp in their own bar
  const hideOnMobile = /^\/(product|configurator|cart|checkout)/.test(pathname);
  return (
    <motion.a
      href={waLink(site.whatsappGreeting)}
      target="_blank"
      rel="noopener"
      aria-label="שלחו לנו הודעה בוואטסאפ"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 18 }}
      className={`group fixed end-4 z-40 items-center gap-2 rounded-full bg-wa p-3.5 text-white shadow-lift sm:end-6 ${
        hideOnMobile ? "bottom-6 hidden lg:flex" : "bottom-4 flex sm:bottom-6"
      }`}
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-wa/50 [animation-duration:2.4s]" />
      <Icon name="whatsapp" className="size-7" />
      <span className="hidden pe-1 text-[15px] font-bold text-white sm:inline">שאלו אותנו בוואטסאפ</span>
    </motion.a>
  );
}
