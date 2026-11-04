"use client";
import Image from "next/image";
import { useT } from "@/i18n/client";
import type { QuoteGift } from "@/lib/pricing";
import { Icon } from "./Icon";

/**
 * A shed's promotion gift in the cart and at checkout: its ₪0 line, and for
 * the parquet floor the colour picker (the colour is the WPC floor add-on's
 * choice, so it travels with the order like any add-on).
 */
export function GiftPicker({ gift, product, id, onPick }: { gift: QuoteGift; product: string; id: string; onPick: (addonId: string, choiceId: string) => void }) {
  const t = useT().gift;
  const a = gift.choiceAddon;
  const choices = a?.choices?.filter((c) => c.id !== a.default) ?? [];
  return (
    <div className="mt-3 rounded-2xl border border-copper/30 bg-copper-tint/60 p-3 text-[13px] leading-5">
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-copper-deep to-copper text-white" aria-hidden="true">
          <Icon name="gift" className="size-4" />
        </span>
        <p className="min-w-0 flex-1 font-bold text-ink">{gift.line.label}</p>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-extrabold text-copper-deep ring-1 ring-copper/30">{t.free}</span>
      </div>
      {a && (
        <fieldset className="mt-3">
          <legend className="sr-only">{t.colourFor(product)}</legend>
          <p className="mb-2 font-semibold text-ink" aria-hidden="true">{t.chooseColour}</p>
          <div className="flex flex-wrap gap-2">
            {choices.map((c) => {
              const on = gift.choice === c.id;
              return (
                <label key={c.id} className={`flex cursor-pointer items-center gap-2 rounded-full border bg-white py-1 ps-1 pe-3 font-semibold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${on ? "border-brand-dark ring-2 ring-brand/40" : "border-line hover:border-ink/40"}`}>
                  <input type="radio" name={`gift-${id}`} className="sr-only" checked={on} onChange={() => onPick(a.id, c.id)} />
                  <span className="relative size-7 shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]" aria-hidden="true">
                    {c.swatch?.includes("/") ? <Image src={c.swatch} alt="" fill sizes="28px" className="object-cover" /> : <span className="absolute inset-0" style={{ background: c.swatch }} />}
                  </span>
                  {c.label}
                  {on && <Icon name="check" className="size-3.5 text-brand-dark" strokeWidth={3} />}
                </label>
              );
            })}
          </div>
          {!gift.choice && <p className="mt-2 font-semibold text-copper-deep">{t.needColour}</p>}
        </fieldset>
      )}
    </div>
  );
}
