import Image from "next/image";
import { dict, type Locale } from "@/i18n";
import { site } from "@/lib/catalog";
import { Icon, type IconName } from "./Icon";
import { Reveal } from "./Reveal";

/** Icons for the dictionary's materials.parts and materials.benefits (+ the warranty), in order. */
const PART_ICONS: IconName[] = ["layers", "shield"];
const BENEFIT_ICONS: IconName[] = ["shield", "sun", "truck", "door", "sparkle", "check"];

/**
 * Callouts on the photo, measured on the render itself (it is shown whole, 16:9,
 * so the points stay put): x/y in % of the photo, and the side the label opens to.
 */
const SPOTS: { x: number; y: number; side: "left" | "right" }[] = [
  { x: 42, y: 24.5, side: "right" },
  { x: 33.1, y: 79, side: "left" },
  { x: 40.6, y: 70, side: "right" },
  { x: 63.5, y: 80.5, side: "right" },
];

/** The render with its callouts (on home, product pages and the FAQ), shown whole at 16:9. */
export function MaterialsPhoto({ locale, sizes = "(min-width:1024px) 55vw, 100vw" }: { locale: Locale; sizes?: string }) {
  const t = dict(locale).materials;
  return (
    <div className="relative aspect-video overflow-hidden rounded-[1.75rem] bg-sand shadow-soft">
      <Image
        src="renders/garden-unit-courtyard.webp"
        alt={t.photoAlt}
        fill
        sizes={sizes}
        className="object-cover"
      />
      {SPOTS.map((s, i) => ({ ...s, label: t.spots[i] })).map((s) => (
        <span key={s.label} className="absolute" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
          <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
            <span className="relative grid size-4 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-glow/70 [animation-iteration-count:3]" />
              <span className="relative size-3 rounded-full bg-brand ring-2 ring-white" />
            </span>
          </span>
          <span className={`absolute top-0 -translate-y-1/2 whitespace-nowrap ${s.side === "left" ? "right-3" : "left-3"} rounded-full bg-night/80 px-2 py-1 text-[10px] font-bold text-white backdrop-blur min-[400px]:px-2.5 min-[400px]:text-[11px] sm:text-xs`}>{s.label}</span>
        </span>
      ))}
    </div>
  );
}

/** What a Modubox shed is made of: aluminium profiles and insulated XPV panels. */
export function Materials({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const t = dict(locale).materials;
  const parts = t.parts.map((p, i) => ({ ...p, icon: PART_ICONS[i] }));
  const benefits = [...t.benefits, { title: t.warrantyBenefit.title(site.warrantyYears), text: t.warrantyBenefit.text }].map((b, i) => ({ ...b, icon: BENEFIT_ICONS[i] }));
  return (
    <section className={compact ? "mt-12 sm:mt-16" : "container-x mt-16 sm:mt-28"} aria-labelledby="materials-title">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">{t.eyebrow}</p>
        <h2 id="materials-title" className={compact ? "mt-1 text-3xl font-extrabold" : "h-section mt-1"}>
          {t.title}
        </h2>
        <p className="mt-3 text-lg leading-8 text-ink-soft">{t.text}</p>
      </Reveal>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-10">
        <Reveal>
          <MaterialsPhoto locale={locale} />
        </Reveal>
        <div className="grid gap-3">
          {parts.map((p, i) => (
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
        {benefits.map((b, i) => (
          <Reveal as="li" key={b.title} delay={i * 0.05} className="flex h-full flex-col gap-2 rounded-2xl border border-line p-4">
            <Icon name={b.icon} className="size-5 text-brand-dark" />
            <span className="font-bold leading-snug">{b.title}</span>
            <span className="text-sm leading-6 text-ink-soft">{b.text}</span>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
