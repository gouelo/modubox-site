import { waLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";

/** Round 8: beyond the fixed sizes, Modubox fits half sizes and exact sizes, after a talk with a rep. */
export const CUSTOM_SIZE_MESSAGE = "היי מודובוקס, אני מחפש/ת מבנה במידה מיוחדת. אשמח לייעוץ אישי:";
const TAGLINE = "מבנים מודולרים בהתאמה אישית";

/** A footprint drawn with dimension lines: "your yard's exact size". */
function MeasuredFootprint({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} fill="none" aria-hidden="true">
      <rect x="22" y="30" width="116" height="74" rx="3" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2" strokeDasharray="6 5" />
      <rect x="22" y="30" width="116" height="74" rx="3" fill="currentColor" fillOpacity="0.08" />
      <path d="M22 14h116M22 9v10M138 9v10" stroke="var(--color-copper)" strokeWidth="1.6" />
      <path d="M150 30v74M145 30h10M145 104h10" stroke="var(--color-copper)" strokeWidth="1.6" />
      <rect x="62" y="6" width="36" height="16" rx="8" fill="var(--color-copper)" />
      <text x="80" y="17.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">3.5</text>
      <rect x="135" y="59" width="30" height="16" rx="8" fill="var(--color-copper)" />
      <text x="150" y="70.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">2.5</text>
    </svg>
  );
}

/**
 * The custom-size card, wide and dark, under the sizes on home and in the
 * catalog: the tagline, the promise and a WhatsApp CTA for a personal consultation.
 */
export function CustomSizeBanner({ fixedSizes, className = "" }: { fixedSizes: number; className?: string }) {
  return (
    <div className={`grain relative isolate overflow-hidden rounded-[2rem] bg-petrol p-6 text-white sm:p-8 lg:p-10 ${className}`}>
      <div className="absolute -bottom-32 -end-24 -z-10 size-80 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
      <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto] lg:gap-10">
        <MeasuredFootprint className="w-32 text-glow sm:w-40" />
        <div>
          <p className="eyebrow text-glow">
            <Icon name="ruler" className="size-4 text-copper" /> {TAGLINE}
          </p>
          <h3 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">מידה מיוחדת? מתאימים בדיוק לחצר שלכם</h3>
          <p className="mt-2 max-w-2xl leading-7 text-white/75">
            מעבר ל־{fixedSizes} המידות הקבועות, אנחנו מתמחים בהתאמה אישית: חצאי מידות ומידות מדויקות, לפי המקום והצורך שלכם. נציג יתאים איתכם את המבנה בייעוץ אישי.
          </p>
        </div>
        <a href={waLink(CUSTOM_SIZE_MESSAGE)} target="_blank" rel="noopener" className="btn-wa whitespace-nowrap px-7 py-4 text-base sm:col-span-2 sm:justify-self-start lg:col-span-1">
          <Icon name="whatsapp" /> ייעוץ אישי בוואטסאפ
        </a>
      </div>
    </div>
  );
}

/** A light one-liner for tight spots: the size picker and a product page's other sizes. */
export function CustomSizeNote({ className = "" }: { className?: string }) {
  return (
    <a
      href={waLink(CUSTOM_SIZE_MESSAGE)}
      target="_blank"
      rel="noopener"
      className={`group flex items-center gap-3 rounded-2xl border border-dashed border-brand/50 bg-brand-tint/40 p-3.5 transition hover:border-brand hover:bg-brand-tint ${className}`}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-dark shadow-soft">
        <Icon name="ruler" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">מידה מיוחדת? מתאימים בדיוק לחצר שלכם</span>
        <span className="block text-sm leading-6 text-ink-soft">חצאי מידות ומידות מדויקות בהתאמה אישית, בייעוץ עם נציג.</span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 text-sm font-bold text-wa-dark sm:flex">
        <Icon name="whatsapp" className="size-4" /> לייעוץ
      </span>
      <Icon name="arrow" className="size-4 shrink-0 text-brand-dark transition group-hover:-translate-x-1 sm:hidden" />
    </a>
  );
}
