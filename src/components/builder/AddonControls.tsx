"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
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
};

const spring = { type: "spring", stiffness: 500, damping: 30 } as const;

export function PriceTag({ price, per = false, className = "" }: { price: number | null | undefined; per?: boolean; className?: string }) {
  if (price === null || price === undefined)
    return <span className={`inline-flex items-center gap-1 rounded-full bg-copper-tint px-2 py-0.5 text-xs font-bold text-copper ring-1 ring-copper/30 ${className}`}>מחיר בתיאום</span>;
  if (price === 0) return <span className={`text-sm font-semibold text-ink-soft ${className}`}>ללא תוספת</span>;
  return (
    <span className={`text-sm font-bold tabular-nums ${className}`}>
      +{formatILS(price)}
      {per && <span className="font-normal text-ink-soft"> ליח׳</span>}
    </span>
  );
}

function Thumb({ addon, on }: { addon: Addon; on: boolean }) {
  return (
    <span className={`relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl transition-colors duration-300 sm:size-20 ${on ? "bg-brand-tint text-brand-dark" : "bg-sand text-ink/60"}`}>
      {addon.image ? (
        <Image src={addon.image} alt="" fill sizes="80px" className="object-cover" />
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

/** A counted add-on: "+ add" turns into a stepper. */
export function QtyCard({ addon, qty, onChange }: { addon: Addon; qty: number; onChange: (qty: number) => void }) {
  const max = addon.maxQty ?? 10;
  const on = qty > 0;
  return (
    <motion.div layout="position" className={shell(on)}>
      <Thumb addon={addon} on={on} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-bold leading-snug">{addon.name}</p>
        {addon.description && <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-soft">{addon.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <PriceTag price={addon.price} per={on} />
          <AnimatePresence mode="popLayout" initial={false}>
            {on ? (
              <motion.div
                key="stepper"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={spring}
                className="flex items-center gap-1 rounded-full bg-ink p-1 text-white"
              >
                <button type="button" onClick={() => onChange(qty - 1)} aria-label={`פחות ${addon.name}`} className="grid size-8 place-items-center rounded-full transition hover:bg-white/15 active:scale-90">
                  <Icon name={qty === 1 ? "trash" : "minus"} className="size-4" />
                </button>
                <span className="relative grid h-8 w-6 place-items-center overflow-hidden font-bold tabular-nums" aria-live="polite">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={qty} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.18 }}>
                      {qty}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <button type="button" onClick={() => onChange(qty + 1)} disabled={qty >= max} aria-label={`עוד ${addon.name}`} className="grid size-8 place-items-center rounded-full transition hover:bg-white/15 active:scale-90 disabled:opacity-30">
                  <Icon name="plus" className="size-4" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={spring}
                onClick={() => onChange(1)}
                className="flex h-10 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm font-bold transition hover:border-ink hover:bg-ink hover:text-white"
              >
                <Icon name="plus" className="size-4" /> הוספה
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function ChoicePrice({ c }: { c: AddonChoice }) {
  return <PriceTag price={c.price} className="shrink-0" />;
}

/** Pick one: colour swatches, or a list of options. */
export function ChoiceGroup({ addon, value, onChange }: { addon: Addon; value: string; onChange: (id: string) => void }) {
  const choices = addon.choices ?? [];
  const swatches = choices.every((c) => c.swatch);
  return (
    <div role="radiogroup" aria-label={addon.name} className="rounded-2xl border border-line bg-white p-3 sm:p-4">
      <div className="flex items-start gap-3">
        {!swatches && <Thumb addon={addon} on={value !== (addon.default ?? choices[0]?.id)} />}
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{addon.name}</p>
          {addon.description && <p className="mt-1 text-sm leading-6 text-ink-soft">{addon.description}</p>}
        </div>
      </div>
      {swatches ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
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
                <span className="relative size-12 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]" style={{ background: c.swatch }}>
                  {on && <motion.span layoutId={`ring-${addon.id}`} transition={spring} className="absolute -inset-1.5 rounded-full border-2 border-brand" />}
                </span>
                <span className="text-start">
                  <span className="block font-bold">{c.label}</span>
                  <ChoicePrice c={c} />
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
                  <ChoicePrice c={c} />
                </span>
              </button>
            );
          })}
        </div>
      )}
      {addon.note && <p className="mt-3 flex items-start gap-2 rounded-xl bg-sand px-3 py-2 text-sm text-ink-soft"><Icon name="sparkle" className="mt-0.5 size-4 shrink-0 text-copper" />{addon.note}</p>}
    </div>
  );
}
