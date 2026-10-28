import { site } from "@/lib/catalog";
import { Icon, type IconName } from "./Icon";

export const TRUST: { icon: IconName; title: string; text: string }[] = [
  { icon: "shield", title: `${site.warrantyYears} שנות אחריות`, text: "על מחסני מודובוקס" },
  { icon: "truck", title: `התקנה עד ${site.installationDays} ימי עסקים`, text: "הובלה והרכבה עד הבית" },
  { icon: "flag", title: "פיתוח וייצור ישראלי", text: "מדגם רשום, מפעל בעין חרוד" },
  { icon: "card", title: `עד ${site.maxPayments} תשלומים`, text: "תשלום מאובטח" },
];

export function TrustBar({ dark = false }: { dark?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TRUST.map((t) => (
        <li key={t.title} className={`flex items-center gap-3 rounded-2xl p-3.5 ${dark ? "bg-white/10 text-white backdrop-blur" : "bg-sand"}`}>
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${dark ? "bg-white/15" : "bg-white text-brand-dark shadow-soft"}`}>
            <Icon name={t.icon} className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-extrabold leading-tight">{t.title}</span>
            <span className={`block text-xs ${dark ? "text-white/70" : "text-ink-soft"}`}>{t.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
