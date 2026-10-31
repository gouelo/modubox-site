"use client";
import Link from "next/link";
import promo from "../../../data/promo.json";
import { useHydrated } from "@/lib/use-hydrated";
import { waLink } from "@/lib/whatsapp";
import { Icon } from "../Icon";
import { Reveal } from "../Reveal";

/** "30.11" from "2026-11-30" */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}`;
}

/** True once the day after `endDate` has begun (Israel time is close enough to the visitor's). */
function ended(endDate: string): boolean {
  if (!endDate) return false;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return iso > endDate;
}

/**
 * The month's promotion: a slim banner under the hero. Its words live in
 * data/promo.json, which Yoel swaps every month; past its end date it hides itself.
 */
export function PromoBanner() {
  // the end date is checked in the visitor's browser (the page itself is built once)
  const over = useHydrated() && ended(promo.endDate);
  if (!promo.enabled || over) return null;

  const wa = promo.cta.href === "whatsapp";
  const cls = "btn shrink-0 whitespace-nowrap bg-white px-6 py-3 text-ink shadow-soft hover:bg-copper-tint";
  const cta = wa ? (
    <a href={waLink(promo.cta.whatsappText || promo.title)} target="_blank" rel="noopener" className={cls}>
      <Icon name="whatsapp" className="size-5 text-wa-dark" /> {promo.cta.label}
    </a>
  ) : (
    <Link href={promo.cta.href} className={cls}>
      {promo.cta.label} <Icon name="arrow" className="size-4" />
    </Link>
  );

  return (
    <section className="container-x mt-8 sm:mt-10" aria-label={promo.eyebrow}>
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-l from-[#b5742c] via-copper to-[#d9a05a] px-5 py-5 text-white shadow-lift sm:px-8 sm:py-6">
          <div className="absolute -start-10 -top-16 -z-10 size-48 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <span className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30 sm:grid">
              <Icon name="sparkle" className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold tracking-wide text-white/90 sm:text-sm">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5">{promo.eyebrow}</span>
                {promo.endDate && <span>בתוקף עד {shortDate(promo.endDate)}</span>}
              </p>
              <p className="mt-1.5 text-xl font-extrabold leading-snug sm:text-2xl">{promo.title}</p>
              {promo.text && <p className="mt-1 text-sm leading-6 text-white/90 sm:text-base">{promo.text}</p>}
            </div>
            {cta}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
