"use client";
import { usePathname } from "next/navigation";
import { switchPath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { asset } from "@/lib/paths";

/** The US flag (on the Hebrew site, to English). */
function FlagUS({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
      <rect width="30" height="20" fill="#b22234" />
      {[1, 3, 5, 7, 9, 11].map((i) => (
        <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#fff" />
      ))}
      <rect width="12" height={(7 * 20) / 13} fill="#3c3b6e" />
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={1.4 + (i % 4) * 3} cy={1.4 + Math.floor(i / 4) * 3.4} r="0.55" fill="#fff" />
      ))}
    </svg>
  );
}

/** The Israeli flag (on the English site, to Hebrew). */
function FlagIL({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 22" className={className} aria-hidden="true">
      <rect width="30" height="22" fill="#fff" />
      <rect y="2.2" width="30" height="3.3" fill="#0038b8" />
      <rect y="16.5" width="30" height="3.3" fill="#0038b8" />
      <path d="M15 6.6 19.2 13.9H10.8ZM15 15.4 10.8 8.1H19.2Z" fill="none" stroke="#0038b8" strokeWidth="1" />
    </svg>
  );
}

/**
 * "EN" with a US flag on the Hebrew site, "עב" with an Israeli flag on the
 * English site: the same page in the other language. A plain link, since the
 * two languages are separate root layouts (a full page load either way).
 */
export function LangSwitch({ className = "", big = false }: { className?: string; big?: boolean }) {
  const locale = useLocale();
  const t = useT().lang;
  const pathname = usePathname() ?? "/";
  const to = locale === "he" ? "en" : "he";
  const flag = "h-3.5 w-auto rounded-[2px] shadow-[0_0_0_1px_rgb(0_0_0/0.12)]";
  return (
    <a
      href={asset(switchPath(pathname, to))}
      hrefLang={to}
      lang={t.switchLang}
      aria-label={t.switchAria}
      className={`inline-flex items-center gap-2 rounded-full font-bold transition ${big ? "h-12 px-4 text-base" : "h-11 px-3 text-sm"} ${className}`}
      onClick={(e) => {
        // keep the section the visitor is on
        if (location.hash) e.currentTarget.href += location.hash;
      }}
    >
      {/* on the narrowest phones the header has room for the label only */}
      {to === "en" ? <FlagUS className={`${flag} ${big ? "" : "max-[379px]:hidden"}`} /> : <FlagIL className={`${flag} ${big ? "" : "max-[379px]:hidden"}`} />}
      {t.switchLabel}
    </a>
  );
}
