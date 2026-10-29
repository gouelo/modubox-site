"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { builderSteps, chosenIn, type BuilderStep } from "@/lib/builder";
import { useCart } from "@/lib/cart-store";
import { addonsFor } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { defaultFulfillment, defaultSelections, fulfillmentOptions, quote, type Quote } from "@/lib/pricing";
import type { Product, Selections } from "@/lib/types";
import { configMessage, waLink } from "@/lib/whatsapp";
import { AnimatedPrice } from "../AnimatedPrice";
import { Footprint } from "../Footprint";
import { Icon } from "../Icon";
import { ChoiceGroup, PriceTag, QtyCard, ToggleCard } from "./AddonControls";

const ease = [0.16, 1, 0.3, 1] as const;

interface Props {
  product: Product;
  /** the other sizes in this product's range, for the size step */
  sizes: Product[];
}

/**
 * The heart of a product page: a guided builder, size → design → doors and
 * windows → power → interior → base → summary, with a running total and the
 * add-ons carried into the cart.
 */
export function AddonBuilder({ product, sizes }: Props) {
  const steps = useMemo(() => builderSteps(product), [product]);
  const [selections, setSelections] = useState<Selections>(() => defaultSelections(product));
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [addedAs, setAddedAs] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLOListElement>(null);
  const add = useCart((s) => s.add);

  const q = quote(product, selections);
  const extras = q.lines.length - 1;
  const added = addedAs === JSON.stringify(selections);
  const delivery = fulfillmentOptions(product)[0];
  const current = steps[step];

  const set = (id: string, v: number | string) => setSelections((s) => ({ ...s, [id]: v }));
  const goTo = (i: number) => {
    setDir(i > step ? 1 : -1);
    setStep(i);
    setSheet(false);
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth" });
  };
  const addToCart = () => {
    add(product.slug, selections, defaultFulfillment(product));
    setAddedAs(JSON.stringify(selections));
  };
  const stepOf = (addonId: string) => steps.findIndex((s) => s.addons.some((a) => a.id === addonId));

  // keep the current step's chip in view in the rail, without moving the page
  useEffect(() => {
    const r = rail.current;
    const chip = r?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!r || !chip) return;
    const box = r.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) return;
    chip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [step]);

  const panel = (
    <motion.div
      key={current.id}
      custom={dir}
      initial={{ opacity: 0, x: dir * -36 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir * 36 }}
      transition={{ duration: 0.3, ease }}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink text-white">
          <Icon name={current.icon} className="size-5" />
        </span>
        <div>
          <h3 className="font-display text-2xl font-bold leading-tight">{current.title}</h3>
          <p className="text-sm text-ink-soft">{current.subtitle}</p>
        </div>
      </div>
      {current.id === "size" ? (
        <SizeStep product={product} sizes={sizes} />
      ) : current.id === "summary" ? (
        <SummaryStep product={product} q={q} goTo={goTo} stepOf={stepOf} />
      ) : (
        <AddonStep step={current} product={product} selections={selections} set={set} />
      )}
    </motion.div>
  );

  const cta = added ? (
    <Link href="/cart/" className="btn-brand w-full py-4 text-base">
      <Icon name="check" /> נוסף לסל · למעבר לסל
    </Link>
  ) : (
    <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={addToCart} className="btn-primary w-full py-4 text-base">
      <Icon name="cart" /> הוספה לסל
    </motion.button>
  );

  return (
    <section id="build" className="scroll-mt-16 lg:scroll-mt-20" aria-labelledby="build-title">
      <div ref={top} className="scroll-mt-16 lg:scroll-mt-20" />
      <div className="relative overflow-hidden rounded-[2rem] bg-sand p-4 sm:p-6 lg:p-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2 sm:mb-6">
          <div>
            <p className="eyebrow">
              <Icon name="sparkle" className="size-4 text-copper" /> מידה, תוספות, סיכום
            </p>
            <h2 id="build-title" className="mt-1 text-[1.9rem] font-bold leading-tight sm:text-4xl">
              הרכיבו את המחסן שלכם
            </h2>
          </div>
          <p className="text-sm font-semibold text-ink-soft">
            שלב {step + 1} מתוך {steps.length}
          </p>
        </div>

        {/* step rail */}
        <ol ref={rail} className="no-scrollbar relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="שלבי הבנייה">
          {steps.map((s, i) => {
            const n = chosenIn(s, selections);
            const active = i === step;
            const done = i < step;
            return (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={active ? "step" : undefined}
                  className={`relative flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors duration-300 ${active ? "text-white" : done ? "bg-white text-ink" : "bg-white/60 text-ink/55 hover:text-ink"}`}
                >
                  {active && <motion.span layoutId="rail-pill" transition={{ type: "spring", stiffness: 400, damping: 34 }} className="absolute inset-0 rounded-full bg-ink" />}
                  <span className={`relative grid size-5 place-items-center rounded-full text-[11px] ${active ? "bg-white/15" : done ? "bg-brand text-white" : "bg-ink/10"}`}>
                    {done && !active ? <Icon name="check" className="size-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="relative">{s.title}</span>
                  <AnimatePresence>
                    {n > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={`relative grid min-w-5 place-items-center rounded-full px-1 text-[11px] ${active ? "bg-brand text-white" : "bg-brand-tint text-brand-dark"}`}
                      >
                        {n}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white">
          <motion.div className="h-full rounded-full bg-gradient-to-l from-brand to-glow" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={{ duration: 0.6, ease }} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="min-w-0">
            <div className="relative">
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                {panel}
              </AnimatePresence>
            </div>

            <div className="mt-6 flex items-center gap-3">
              {step > 0 && (
                <button type="button" onClick={() => goTo(step - 1)} className="btn-ghost h-12 px-5" aria-label="לשלב הקודם">
                  <Icon name="arrow" className="size-4 rotate-180" /> חזרה
                </button>
              )}
              {step < steps.length - 1 ? (
                <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => goTo(step + 1)} className="btn-primary h-12 flex-1 sm:flex-none sm:px-8">
                  {step === steps.length - 2 ? "לסיכום" : `הבא: ${steps[step + 1].title}`} <Icon name="arrow" className="size-4" />
                </motion.button>
              ) : (
                <div className="flex-1 lg:hidden">{cta}</div>
              )}
            </div>
          </div>

          {/* desktop: live summary */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl bg-ink p-6 text-white shadow-lift">
              <div className="flex items-center gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-white/10">
                  <Image src={product.images[0]} alt="" fill sizes="56px" className="object-cover" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-white/60">המחסן שלכם</p>
                  <p className="truncate font-bold">{product.name}</p>
                </div>
              </div>
              <Lines q={q} dark onJump={(id) => goTo(stepOf(id))} />
              <div className="mt-4 border-t border-white/15 pt-4">
                <p className="text-sm text-white/60">סה&quot;כ כולל מע&quot;מ</p>
                <AnimatedPrice value={q.total} className="font-display text-4xl font-bold" />
                {q.onRequest.length > 0 && <p className="mt-1 text-sm text-copper">+ {q.onRequest.length} פריטים במחיר בתיאום</p>}
                <p className="mt-1 text-xs text-white/50">
                  {delivery.price === null ? "הובלה והתקנה בתיאום" : delivery.price === 0 ? "כולל הובלה והרכבה" : `+ הובלה והתקנה ${formatILS(delivery.price)} (נבחר בסל)`}
                </p>
              </div>
              <div className="mt-5 grid gap-2">
                {added ? cta : (
                  <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={addToCart} className="btn w-full bg-white py-4 text-base text-ink hover:bg-brand-tint">
                    <Icon name="cart" /> הוספה לסל
                  </motion.button>
                )}
                <a href={waLink(configMessage(product, q))} target="_blank" rel="noopener" className="btn-glass w-full">
                  <Icon name="whatsapp" className="size-5 text-wa" /> שליחת ההרכב בוואטסאפ
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* mobile: floating total dock */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <AnimatePresence>
          {sheet && (
            <>
              <motion.button
                type="button"
                aria-label="סגירת הסיכום"
                className="fixed inset-0 -z-10 bg-night/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSheet(false)}
              />
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ duration: 0.35, ease }}
                className="mb-2 max-h-[60svh] overflow-y-auto rounded-3xl bg-white p-5 shadow-lift"
              >
                <p className="font-display text-xl font-bold">{product.name}</p>
                <Lines q={q} onJump={(id) => goTo(stepOf(id))} />
                <a href={waLink(configMessage(product, q))} target="_blank" rel="noopener" className="btn-wa mt-4 w-full">
                  <Icon name="whatsapp" /> שליחת ההרכב בוואטסאפ
                </a>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <div className="mx-auto flex max-w-xl items-center gap-2 rounded-[1.4rem] bg-ink/95 p-2 ps-4 text-white shadow-lift ring-1 ring-white/10 backdrop-blur-md">
          <button type="button" onClick={() => setSheet((v) => !v)} aria-expanded={sheet} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-start">
            <span className="min-w-0">
              <span className="block text-[11px] text-white/60">
                {extras === 0 ? "מחיר בסיס" : extras === 1 ? "תוספת אחת" : `${extras} תוספות`}
                {q.onRequest.length ? " · חלק בתיאום" : ""}
              </span>
              <AnimatedPrice value={q.total} className="text-xl font-black leading-tight" />
            </span>
            <Icon name="chevron" className={`size-4 shrink-0 text-white/60 transition-transform duration-300 ${sheet ? "" : "rotate-180"}`} />
          </button>
          {added ? (
            <Link href="/cart/" className="btn-brand h-12 shrink-0 px-5">
              <Icon name="check" /> לסל
            </Link>
          ) : (
            <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={addToCart} className="btn h-12 shrink-0 bg-white px-5 text-ink">
              <Icon name="cart" /> הוספה לסל
            </motion.button>
          )}
        </div>
      </div>
    </section>
  );
}

function SizeStep({ product, sizes }: { product: Product; sizes: Product[] }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {sizes.map((p) => {
        const on = p.slug === product.slug;
        return (
          <Link
            key={p.slug}
            href={`/product/${p.slug}/#build`}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={`group relative flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2.5 text-center sm:gap-1 sm:rounded-2xl sm:py-3 transition-all duration-300 ${on ? "border-ink bg-ink text-white shadow-lift" : "border-line bg-white hover:-translate-y-0.5 hover:border-ink/40"}`}
          >
            <Footprint w={p.widthM} d={p.depthM} className={`hidden size-9 sm:block ${on ? "text-glow" : "text-ink/70"}`} />
            <span className="text-[15px] font-black" dir="ltr">{p.sizeLabel}</span>
            <span className={`text-[11px] tabular-nums sm:text-xs ${on ? "text-white/70" : "text-ink-soft"}`}>{formatILS(p.price)}</span>
          </Link>
        );
      })}
    </div>
  );
}

function AddonStep({ step, product, selections, set }: { step: BuilderStep; product: Product; selections: Selections; set: (id: string, v: number | string) => void }) {
  const panel = addonsFor(product).find((a) => a.id === "electric-panel");
  const wantsPanel = step.addons.some((a) => a.id === "ac") && selections.ac !== undefined && selections.ac !== "none" && panel && !selections["electric-panel"];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {step.addons.map((a) => (
        <motion.div key={a.id} layout="position" className={a.kind === "choice" ? "md:col-span-2" : ""}>
          {a.kind === "choice" ? (
            <ChoiceGroup addon={a} value={String(selections[a.id] ?? a.default ?? "")} onChange={(v) => set(a.id, v)} />
          ) : a.kind === "qty" ? (
            <QtyCard addon={a} qty={Number(selections[a.id] ?? 0)} onChange={(v) => set(a.id, v)} />
          ) : (
            <ToggleCard addon={a} on={Number(selections[a.id] ?? 0) > 0} onChange={(on) => set(a.id, on ? 1 : 0)} />
          )}
        </motion.div>
      ))}
      <AnimatePresence>
        {wantsPanel && panel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden md:col-span-2"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-copper-tint p-3 ring-1 ring-copper/25">
              <Icon name="bolt" className="size-5 shrink-0 text-copper" />
              <p className="flex-1 text-sm font-semibold">מזגן צריך חשמל: מומלץ להוסיף פאנל חיבור לחשמל.</p>
              <button type="button" onClick={() => set("electric-panel", 1)} className="btn h-10 shrink-0 bg-ink px-4 text-sm text-white">
                הוספה <PriceTag price={panel.price} className="text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Lines({ q, dark = false, onJump }: { q: Quote; dark?: boolean; onJump: (addonId: string) => void }) {
  const extras = q.lines.slice(1);
  return (
    <ul className={`mt-4 space-y-1 text-sm ${dark ? "text-white/85" : "text-ink"}`}>
      <li className="flex justify-between gap-3 py-1">
        <span className={dark ? "text-white/60" : "text-ink-soft"}>מחיר בסיס</span>
        <span className="font-semibold tabular-nums">{formatILS(q.lines[0].total ?? 0)}</span>
      </li>
      <AnimatePresence initial={false}>
        {extras.map((l) => (
          <motion.li
            key={l.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <button type="button" onClick={() => onJump(l.id)} className="flex w-full justify-between gap-3 py-1 text-start hover:underline">
              <span>
                {l.label}
                {l.qty > 1 && <span className={dark ? "text-white/60" : "text-ink-soft"}> ×{l.qty}</span>}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {l.total === null ? <span className="text-copper">בתיאום</span> : l.total === 0 ? "ללא תוספת" : `+${formatILS(l.total)}`}
              </span>
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
      {extras.length === 0 && <li className={`py-1 ${dark ? "text-white/45" : "text-ink-soft"}`}>עוד לא נבחרו תוספות</li>}
    </ul>
  );
}

function SummaryStep({ product, q, goTo, stepOf }: { product: Product; q: Quote; goTo: (i: number) => void; stepOf: (id: string) => number }) {
  const delivery = fulfillmentOptions(product)[0];
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
      <div className="relative h-40 sm:h-52">
        <Image src={product.images[0]} alt={product.name} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
        <p className="absolute bottom-3 start-4 font-display text-2xl font-bold text-white">{product.name}</p>
      </div>
      <div className="p-4 sm:p-6">
        <Lines q={q} onJump={(id) => goTo(stepOf(id))} />
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-4">
          <div>
            <p className="text-sm text-ink-soft">סה&quot;כ כולל מע&quot;מ</p>
            <AnimatedPrice value={q.total} className="font-display text-4xl font-bold" showDelta={false} />
          </div>
          <button type="button" onClick={() => goTo(1)} className="text-sm font-bold text-brand-dark underline underline-offset-4">
            שינוי תוספות
          </button>
        </div>
        {q.onRequest.length > 0 && (
          <p className="mt-3 rounded-xl bg-copper-tint px-3 py-2 text-sm text-ink ring-1 ring-copper/25">
            <strong className="text-copper">מחיר בתיאום:</strong> {q.onRequest.map((l) => l.label).join(", ")}. נציג יאשר את המחיר מולכם לפני התשלום.
          </p>
        )}
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <Icon name="truck" className="size-4 shrink-0 text-brand-dark" />
          {delivery.price === null ? "הובלה והתקנה בתיאום" : delivery.price === 0 ? "כולל הובלה והרכבה" : `הובלה והתקנה: ${formatILS(delivery.price)}, נבחרות בסל`}
        </p>
        <a href={waLink(configMessage(product, q))} target="_blank" rel="noopener" className="btn-wa mt-4 w-full">
          <Icon name="whatsapp" /> שליחת ההרכב בוואטסאפ
        </a>
      </div>
    </div>
  );
}
