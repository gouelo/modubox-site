"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useLocale, useT } from "@/i18n/client";
import { formatILS } from "@/lib/format";
import type { Addon, AddonChoice } from "@/lib/types";
import { Icon, type IconName } from "../Icon";

const ICONS: Record<string, IconName> = {
  "profile-color": "palette",
  "double-door": "door",
  "extra-door": "door",
  "sliding-window": "window",
  "glass-wall": "window",
  "electric-panel": "bolt",
  ac: "snow",
  "vent-grill": "wind",
  "shelf-4": "shelf",
  "shelf-5": "shelf",
  "wpc-floor": "ruler",
};

const spring = { type: "spring", stiffness: 500, damping: 30 } as const;

export function PriceTag({ price, per = false, className = "" }: { price: number | null | undefined; per?: boolean; className?: string }) {
  const locale = useLocale();
  const t = useT();
  if (price === null || price === undefined)
    return <span className={`inline-flex items-center gap-1 rounded-full bg-copper-tint px-2 py-0.5 text-xs font-bold text-copper-deep ring-1 ring-copper/30 ${className}`}>{t.common.priceOnRequest}</span>;
  if (price === 0) return <span className={`text-sm font-semibold text-ink-soft ${className}`}>{t.common.noExtra}</span>;
  return (
    <span className={`text-sm font-bold tabular-nums ${className}`}>
      +{formatILS(price, locale)}
      {per && <span className="font-normal text-ink-soft"> {t.builder.perUnit}</span>}
    </span>
  );
}

function Thumb({ addon, on }: { addon: Addon; on: boolean }) {
  return (
    <span className={`relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl transition-colors duration-300 sm:size-20 ${on ? "bg-brand-tint text-brand-dark" : "bg-sand text-ink/60"}`}>
      {addon.image ? (
        <Image src={addon.image} alt={addon.name} fill sizes="80px" className="object-cover" />
      ) : (
        <Icon name={ICONS[addon.id] ?? "sparkle"} className="size-7" />
      )}
      <AnimatePresence>
        {on && (
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={spring}
            className="absolute top-1 start-1 grid size-6 place-items-center rounded-full bg-brand text-white shadow-glow"
            aria-hidden="true"
          >
            <Icon name="check" className="size-3.5" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function shell(on: boolean) {
  return `relative flex w-full gap-3 rounded-2xl border bg-white p-3 text-start transition-all duration-300 ease-(--ease-out-expo) sm:gap-4 sm:p-4 ${
    on ? "border-brand shadow-[0_0_0_1px_var(--color-brand),0_12px_30px_-14px_rgb(2_159_159/0.5)]" : "border-line hover:border-ink/30 hover:shadow-soft"
  }`;
}

/** An on/off add-on: the whole card is the switch. */
export function ToggleCard({ addon, on, onChange }: { addon: Addon; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <motion.button type="button" layout="position" whileTap={{ scale: 0.985 }} aria-pressed={on} onClick={() => onChange(!on)} className={shell(on)}>
      <Thumb addon={addon} on={on} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-bold leading-snug">{addon.name}</span>
          <span
            className={`relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 ${on ? "bg-brand" : "bg-ink/15"}`}
            aria-hidden="true"
          >
            <motion.span layout transition={spring} className={`size-5 rounded-full bg-white shadow ${on ? "ms-auto" : ""}`} />
          </span>
        </span>
        {addon.description && <span className="mt-1 block text-sm leading-6 text-ink-soft">{addon.description}</span>}
        {addon.note && <span className="mt-2 block rounded-xl bg-sand px-3 py-2 text-[13px] leading-5 text-ink-soft">{addon.note}</span>}
        <PriceTag price={addon.price} className="mt-1.5 inline-block" />
      </span>
    </motion.button>
  );
}

/** "+ add", which turns into a − n + stepper. `name` says what is counted, for the buttons' labels. */
function Stepper({ qty, max, name, onChange }: { qty: number; max: number; name: string; onChange: (qty: number) => void }) {
  const t = useT();
  const box = useRef<HTMLSpanElement>(null);
  const plus = useRef<HTMLButtonElement>(null);
  const addBtn = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  // the button pressed goes away (add ⇄ stepper): keep the keyboard's place on the one that replaces it
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    (qty > 0 ? plus : addBtn).current?.focus();
  }, [qty]);
  const change = (n: number) => {
    refocus.current = (n > 0) !== (qty > 0) && !!box.current?.contains(document.activeElement);
    onChange(n);
  };
  return (
    <span ref={box} className="contents">
    <AnimatePresence mode="popLayout" initial={false}>
      {qty > 0 ? (
        <motion.div
          key="stepper"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={spring}
          className="flex shrink-0 items-center gap-1 rounded-full bg-ink p-1 text-white"
        >
          <button type="button" onClick={() => change(qty - 1)} aria-label={t.builder.less(name)} className="grid size-8 place-items-center rounded-full transition hover:bg-white/15 active:scale-90">
            <Icon name={qty === 1 ? "trash" : "minus"} className="size-4" />
          </button>
          <span className="relative grid h-8 w-6 place-items-center overflow-hidden font-bold tabular-nums" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={qty} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.18 }}>
                {qty}
              </motion.span>
            </AnimatePresence>
          </span>
          <button ref={plus} type="button" onClick={() => change(qty + 1)} disabled={qty >= max} aria-label={t.builder.more(name)} className="grid size-8 place-items-center rounded-full transition hover:bg-white/15 active:scale-90 disabled:opacity-30">
            <Icon name="plus" className="size-4" />
          </button>
        </motion.div>
      ) : (
        <motion.button
          ref={addBtn}
          key="add"
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={spring}
          onClick={() => change(1)}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm font-bold transition hover:border-ink hover:bg-ink hover:text-white"
        >
          <Icon name="plus" className="size-4" /> {t.common.add}
          <span className="sr-only"> {name}</span>
        </motion.button>
      )}
    </AnimatePresence>
    </span>
  );
}

/** A counted add-on: "+ add" turns into a stepper. */
export function QtyCard({ addon, qty, onChange }: { addon: Addon; qty: number; onChange: (qty: number) => void }) {
  const max = addon.maxQty ?? 10;
  const on = qty > 0;
  return (
    <motion.div layout="position" className={shell(on)}>
      <Thumb addon={addon} on={on} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-bold leading-snug">{addon.name}</p>
        {addon.description && <p className={`mt-1 text-sm leading-6 text-ink-soft ${addon.note ? "" : "line-clamp-2"}`}>{addon.description}</p>}
        {addon.note && <p className="mt-2 rounded-xl bg-sand px-3 py-2 text-[13px] leading-5 text-ink-soft">{addon.note}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <PriceTag price={addon.price} per={on} />
          <Stepper qty={qty} max={max} name={addon.name} onChange={onChange} />
        </div>
      </div>
    </motion.div>
  );
}

function ChoicePrice({ c, gift = false }: { c: AddonChoice; gift?: boolean }) {
  const t = useT();
  if (gift && c.price) return <span className="shrink-0 text-sm font-extrabold text-copper-deep">{t.gift.free}</span>;
  return <PriceTag price={c.price} className="shrink-0" />;
}

/** A colour dot, a material sample (an image), or, for "none", an empty ring. */
function Swatch({ swatch }: { swatch?: string }) {
  if (!swatch) return <span className="absolute inset-0 rounded-full border-2 border-dashed border-ink/25" />;
  if (swatch.includes("/"))
    return (
      <span className="absolute inset-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]">
        <Image src={swatch} alt="" fill sizes="48px" className="object-cover" />
      </span>
    );
  return <span className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]" style={{ background: swatch }} />;
}

/** "120 ₪ למ"ר × 6 מ"ר = 720 ₪" for an add-on priced by floor area. */
function AreaPrice({ addon }: { addon: Addon }) {
  const locale = useLocale();
  const t = useT().builder;
  if (!addon.pricePerM2 || !addon.areaM2) return null;
  return (
    <p className="mt-2 inline-flex flex-wrap items-center gap-x-1.5 rounded-full bg-brand-tint px-3 py-1 text-sm font-semibold text-brand-dark">
      <span>{t.perM2(formatILS(addon.pricePerM2, locale))}</span>
      <span aria-hidden="true">×</span>
      <span>{t.inThisShed(addon.areaM2)}</span>
      <span aria-hidden="true">=</span>
      <span className="font-extrabold tabular-nums">{formatILS(Math.round(addon.pricePerM2 * addon.areaM2), locale)}</span>
    </p>
  );
}

/** Pick one: colour swatches, or a list of options. `gift`: the promotion makes it free (the WPC floor from 6 m²). */
export function ChoiceGroup({ addon, value, onChange, gift = false }: { addon: Addon; value: string; onChange: (id: string) => void; gift?: boolean }) {
  const t = useT();
  const choices = addon.choices ?? [];
  const swatches = choices.some((c) => c.swatch) && choices.every((c) => c.swatch || c.id === addon.default);
  return (
    <div role="radiogroup" aria-label={addon.name} className="rounded-2xl border border-line bg-white p-3 sm:p-4">
      <div className="flex items-start gap-3">
        {!swatches && <Thumb addon={addon} on={value !== (addon.default ?? choices[0]?.id)} />}
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{addon.name}</p>
          {addon.description && <p className="mt-1 text-sm leading-6 text-ink-soft">{addon.description}</p>}
          {gift ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-copper-tint px-3 py-1 text-sm font-bold text-copper-deep ring-1 ring-copper/30">
              <Icon name="gift" className="size-4 shrink-0" /> {t.gift.floorFree}
            </p>
          ) : (
            <AreaPrice addon={addon} />
          )}
        </div>
      </div>
      {swatches ? (
        <div className={`mt-4 grid grid-cols-2 gap-3 ${choices.length > 2 ? "sm:grid-cols-4" : ""}`}>
          {choices.map((c) => {
            const on = c.id === value;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange(c.id)}
                className={`group relative flex items-center gap-3 rounded-2xl border p-3 transition-all duration-300 ${on ? "border-brand bg-brand-tint/50" : "border-line hover:border-ink/30"}`}
              >
                <span className="relative size-12 shrink-0 rounded-full">
                  <Swatch swatch={c.swatch} />
                  {on && <motion.span layoutId={`ring-${addon.id}`} transition={spring} className="absolute -inset-1.5 rounded-full border-2 border-brand" />}
                </span>
                <span className="text-start">
                  <span className="block font-bold">{c.label}</span>
                  <ChoicePrice c={c} gift={gift} />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {choices.map((c) => {
            const on = c.id === value;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange(c.id)}
                className={`relative flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[15px] transition-colors duration-200 ${on ? "text-ink" : "text-ink/80 hover:bg-sand"}`}
              >
                {on && <motion.span layoutId={`bg-${addon.id}`} transition={spring} className="absolute inset-0 rounded-xl bg-brand-tint ring-1 ring-brand" />}
                <span className={`relative grid size-5 shrink-0 place-items-center rounded-full border-2 transition ${on ? "border-brand" : "border-ink/25"}`}>
                  {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="size-2.5 rounded-full bg-brand" />}
                </span>
                <span className={`relative flex-1 ${on ? "font-bold" : "font-medium"}`}>{c.label}</span>
                <span className="relative">
                  <ChoicePrice c={c} gift={gift} />
                </span>
              </button>
            );
          })}
        </div>
      )}
      {addon.note && <p className="mt-3 flex items-start gap-2 rounded-xl bg-sand px-3 py-2 text-sm text-ink-soft"><Icon name="sparkle" className="mt-0.5 size-4 shrink-0 text-copper-deep" />{addon.note}</p>}
    </div>
  );
}

/**
 * A choice add-on taken by the unit (`perChoiceQty`: the glass wall): a stepper
 * for each option but "none", so a shed can have two glass walls, or one with
 * a shutter and one without. `value(id)` is how many of an option.
 */
export function ChoiceQtyGroup({ addon, value, onChange, max }: { addon: Addon; value: (choiceId: string) => number; onChange: (choiceId: string, qty: number) => void; max: number }) {
  const b = useT().builder;
  const options = (addon.choices ?? []).filter((c) => c.id !== addon.default);
  const total = options.reduce((n, c) => n + value(c.id), 0);
  return (
    <div role="group" aria-labelledby={`qty-${addon.id}`} className="rounded-2xl border border-line bg-white p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <Thumb addon={addon} on={total > 0} />
        <div className="min-w-0 flex-1">
          <p id={`qty-${addon.id}`} className="font-bold leading-snug">{addon.name}</p>
          {addon.description && <p className="mt-1 text-sm leading-6 text-ink-soft">{addon.description}</p>}
          <p className="mt-2 text-sm font-semibold text-brand-dark">{b.perChoiceHint(max)}</p>
        </div>
      </div>
      <ul className="mt-3 grid gap-2">
        {options.map((c) => {
          const n = value(c.id);
          return (
            <li key={c.id} className={`flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl px-3 py-2 transition-colors duration-200 ${n > 0 ? "bg-brand-tint ring-1 ring-brand" : "bg-sand/60"}`}>
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] ${n > 0 ? "font-bold" : "font-medium"}`}>{c.label}</span>
                <PriceTag price={c.price} per />
              </span>
              <Stepper qty={n} max={max} name={c.label} onChange={(q) => onChange(c.id, Math.max(0, Math.min(max, q)))} />
            </li>
          );
        })}
      </ul>
      {addon.note && <p className="mt-3 flex items-start gap-2 rounded-xl bg-sand px-3 py-2 text-sm text-ink-soft"><Icon name="sparkle" className="mt-0.5 size-4 shrink-0 text-copper-deep" />{addon.note}</p>}
    </div>
  );
}
