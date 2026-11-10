"use client";
import Image from "next/image";
import Link from "next/link";
import { lp } from "@/i18n";
import { catalog, promo } from "@/lib/catalog";
import { giftName, giftRules, giftsActive } from "@/lib/promo-gifts";
import { useLocale, useT } from "@/i18n/client";
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
 * data/promo.json, which Yoel swaps every month (the English site's words are
 * its "en" block); past its end date it hides itself.
 */
export function PromoBanner() {
  const locale = useLocale();
  const t = useT();
  // the end date is checked in the visitor's browser (the page itself is built once)
  const hydrated = useHydrated();
  const over = hydrated && ended(promo.endDate);
  const words = locale === "en" ? { ...promo.en, cta: { ...promo.cta, label: promo.en.ctaLabel, whatsappText: promo.en.whatsappText } } : promo;
  if (!promo.enabled || !words.enabled || over) return null;
  // the gifts' days are checked in the browser too; before that, as the page was built
  const gifts = giftRules.enabled && (!hydrated || giftsActive());

  const wa = promo.cta.href === "whatsapp";
  const cls = "btn shrink-0 whitespace-nowrap bg-white px-6 py-3 text-ink shadow-soft hover:bg-copper-tint";
  const cta = wa ? (
    <a href={waLink(words.cta.whatsappText || words.title)} target="_blank" rel="noopener" className={cls}>
      <Icon name="whatsapp" className="size-5 text-wa-dark" /> {words.cta.label}
    </a>
  ) : (
    <Link href={lp(locale, promo.cta.href)} className={cls}>
      {words.cta.label} <Icon name="arrow" className="size-4" />
    </Link>
  );

  if (gifts) return <GiftPromo words={words} cta={cta} />;

  return (
    <section className="container-x mt-8 sm:mt-10" aria-label={words.eyebrow}>
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-l from-[#7d4f1c] via-copper-deep to-[#96602a] ltr:bg-gradient-to-r px-5 py-5 text-white shadow-lift sm:px-8 sm:py-6">
          <div className="absolute -start-10 -top-16 -z-10 size-48 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <span className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30 sm:grid">
              <Icon name="sparkle" className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold tracking-wide text-white/90 sm:text-sm">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5">{words.eyebrow}</span>
                {promo.endDate && <span>{t.promo.validUntil(shortDate(promo.endDate))}</span>}
              </p>
              <p className="mt-1.5 text-xl font-extrabold leading-snug sm:text-2xl">{words.title}</p>
              {words.text && <p className="mt-1 text-sm leading-6 text-white/90 sm:text-base">{words.text}</p>}
            </div>
            {cta}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** Swatches of the floor's colours (the WPC floor add-on's samples). */
function FloorSwatches() {
  const floor = catalog(useLocale()).addonById.get(giftRules.large.addon);
  // alt for SEO tools and image search only: the wrapper is aria-hidden, the tile's words say it
  const swatches = (floor?.choices ?? []).filter((c): c is typeof c & { swatch: string } => !!c.swatch?.includes("/")).map((c) => ({ sw: c.swatch, alt: `${floor?.name ?? ""} – ${c.label}` }));
  return (
    <span className="flex -space-x-3 rtl:space-x-reverse" aria-hidden="true">
      {swatches.map(({ sw, alt }) => (
        <span key={sw} className="relative size-11 overflow-hidden rounded-full shadow-soft ring-2 ring-white sm:size-12">
          <Image src={sw} alt={alt} fill sizes="48px" className="object-cover" />
        </span>
      ))}
    </span>
  );
}

/**
 * November 2026: a gift with every Modubox shed (data/promo-gifts.json), a
 * shelving unit under the threshold and a parquet floor from it up, with the
 * promotion's photo (cut from Yoel's artwork, without its baked-in text).
 * The words above the gifts are the admin's promo banner; the gifts and the
 * threshold come from the rules, so the banner and the cart always agree.
 */
function GiftPromo({ words, cta }: { words: { eyebrow: string; title: string; text: string }; cta: React.ReactNode }) {
  const locale = useLocale();
  const t = useT().promo;
  const g = t.gifts;
  const r = giftRules;
  const n = r.thresholdM2;
  const dates = [shortDate(r.advertisedStart || r.start), shortDate(r.end)] as const;
  const shelf = catalog(locale).addonById.get(r.small.addon);
  const tiles = [
    { key: "small", when: r.atThreshold === "large" ? g.below(n) : g.upTo(n), what: g.gift(giftName(r.small, locale)), sub: "", art: shelf?.image ? <span className="relative block size-14 shrink-0 overflow-hidden rounded-xl bg-white sm:size-16" aria-hidden="true"><Image src={shelf.image} alt={shelf.name} fill sizes="64px" className="object-contain p-1" /></span> : null },
    { key: "large", when: r.atThreshold === "large" ? g.from(n) : g.above(n), what: g.gift(giftName(r.large, locale)), sub: g.anyColour, art: <FloorSwatches /> },
  ];
  return (
    <section className="container-x mt-8 sm:mt-10" aria-labelledby="promo-title">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-petrol text-white shadow-lift lg:grid lg:grid-cols-[1fr_1.1fr]">
          <div className="lg:order-2 lg:self-center lg:p-7 lg:ps-0">
            <div className="relative aspect-[16/9] lg:overflow-hidden lg:rounded-3xl lg:shadow-lift lg:ring-1 lg:ring-white/15">
              <Image src="promo/november-gifts.webp" alt={g.imageAlt} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-petrol to-transparent lg:hidden" aria-hidden="true" />
            </div>
          </div>
          <div className="relative px-5 pb-6 pt-2 sm:px-8 sm:pb-8 lg:self-center lg:px-10 lg:py-9">
            <div className="absolute -end-16 -top-20 -z-10 size-64 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold tracking-wide text-white/90 sm:text-sm">
              <span className="rounded-full bg-brand-dark px-3 py-1 text-white">{words.eyebrow}</span>
              <span dir="ltr">{dates[0]}–{dates[1]}</span>
            </p>
            <h2 id="promo-title" className="mt-3 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-[2.1rem] xl:text-4xl">{words.title}</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {tiles.map((x) => (
                <li key={x.key} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-ink shadow-soft sm:p-4">
                  {x.art}
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-brand-dark">{x.when}</span>
                    <span className="block text-lg font-extrabold leading-snug">{x.what}</span>
                    {x.sub && <span className="block text-sm text-ink-soft">{x.sub}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {words.text && <p className="mt-4 text-[15px] leading-6 text-white/85">{words.text}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              {cta}
              <p className="text-xs text-white/70">{g.fine(...dates)}</p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
