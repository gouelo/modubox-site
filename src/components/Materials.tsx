import Image from "next/image";
import { site } from "@/lib/catalog";
import { Icon, type IconName } from "./Icon";
import { Reveal } from "./Reveal";

const PARTS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "layers",
    title: "שלדה ופרופילי אלומיניום",
    text: "השלד והפרופילים מאלומיניום, בלבן או בשחור. אלומיניום לא מחליד ולא נרקב, קל ויציב, ושומר על מראה נקי לאורך שנים.",
  },
  {
    icon: "shield",
    title: "פאנל מבודד XPV",
    text: "הקירות עשויים פאנל מבודד XPV עם ליבת בידוד, ששומר על טמפרטורה נעימה יותר בפנים, בקיץ ובחורף. גימור נקי ואחיד, בלי צביעה.",
  },
];

const BENEFITS: { icon: IconName; title: string; text: string }[] = [
  { icon: "shield", title: "לא מחליד, לא נרקב", text: "בלי עץ שנרקב ובלי ברזל שמחליד" },
  { icon: "sun", title: "מבודד", text: "נעים יותר בפנים, גם בקיץ הישראלי" },
  { icon: "truck", title: "התקנה מהירה", text: "מגיע מוכן מהמפעל ומורכב אצלכם" },
  { icon: "door", title: "מודולרי", text: "דלתות, חלונות וויטרינות בכל קיר" },
  { icon: "sparkle", title: "כמעט בלי תחזוקה", text: "שוטפים במים, בלי לצבוע או לשמן" },
  { icon: "check", title: `${site.warrantyYears} שנות אחריות`, text: "ייצור ישראלי, במפעל שלנו" },
];

/**
 * Callouts on the photo, measured on the render itself (it is shown whole, 16:9,
 * so the points stay put): x/y in % of the photo, and the side the label opens to.
 */
const SPOTS: { x: number; y: number; label: string; side: "left" | "right" }[] = [
  { x: 42, y: 24.5, label: "חלונות סקיילייט", side: "right" },
  { x: 33.1, y: 79, label: "פרופיל אלומיניום", side: "left" },
  { x: 40.6, y: 70, label: "פאנל מבודד XPV", side: "right" },
  { x: 63.5, y: 80.5, label: "רצפה פנימית מוגבהת", side: "right" },
];

/** What a Modubox shed is made of: aluminium profiles and insulated XPV panels. */
export function Materials({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "mt-12 sm:mt-16" : "container-x mt-16 sm:mt-28"} aria-labelledby="materials-title">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">החומרים</p>
        <h2 id="materials-title" className={compact ? "mt-1 text-3xl font-extrabold" : "h-section mt-1"}>
          ממה עשוי מחסן מודובוקס?
        </h2>
        <p className="mt-3 text-lg leading-8 text-ink-soft">שני חומרים, שנבחרו כדי שהמבנה יעמוד שנים בחוץ: שלדת אלומיניום וקירות מפאנל מבודד.</p>
      </Reveal>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-10">
        <Reveal>
          <div className="relative aspect-video overflow-hidden rounded-[1.75rem] bg-sand shadow-soft">
            <Image
              src="renders/garden-unit-courtyard.webp"
              alt="יחידת מודובוקס עם פרופילי אלומיניום כהים, קירות פאנל לבנים, חלון הזזה וקיר זכוכית עם תריס"
              fill
              sizes="(min-width:1024px) 55vw, 100vw"
              className="object-cover"
            />
            {SPOTS.map((s) => (
              <span key={s.label} className="absolute" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
                  <span className="relative grid size-4 place-items-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-glow/70" />
                    <span className="relative size-3 rounded-full bg-brand ring-2 ring-white" />
                  </span>
                </span>
                <span className={`absolute top-0 -translate-y-1/2 whitespace-nowrap ${s.side === "left" ? "right-3" : "left-3"} rounded-full bg-night/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur sm:text-xs`}>{s.label}</span>
              </span>
            ))}
          </div>
        </Reveal>
        <div className="grid gap-3">
          {PARTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="flex gap-4 rounded-3xl bg-sand p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ink text-white">
                  <Icon name={p.icon} className="size-5" />
                </span>
                <div>
                  <h3 className="text-xl font-extrabold">{p.title}</h3>
                  <p className="mt-1 leading-7 text-ink-soft">{p.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {BENEFITS.map((b, i) => (
          <Reveal key={b.title} delay={i * 0.05}>
            <li className="flex h-full flex-col gap-2 rounded-2xl border border-line p-4">
              <Icon name={b.icon} className="size-5 text-brand-dark" />
              <span className="font-bold leading-snug">{b.title}</span>
              <span className="text-sm leading-6 text-ink-soft">{b.text}</span>
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
