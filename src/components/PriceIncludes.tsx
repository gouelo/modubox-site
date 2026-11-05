"use client";
import { useT } from "@/i18n/client";
import { giftFor, giftRules, giftsActive } from "@/lib/promo-gifts";
import { useHydrated } from "@/lib/use-hydrated";
import type { Product } from "@/lib/types";
import { Icon } from "./Icon";

/**
 * What a Modubox shed's base price includes and what is an extra (Yoel,
 * 2026-11-05: the same for every size). The WPC floor line notes the
 * promotion's gift while it runs (checked in the browser, like the banner).
 */
export function PriceIncludes({ product }: { product: Product }) {
  const t = useT().product.includes;
  const hydrated = useHydrated();
  // before hydration, as the page was built; then by today's date
  const floorGift = giftRules.enabled && (!hydrated || giftsActive()) && giftFor(product, giftRules.start)?.addon === "wpc-floor";
  return (
    <section className="mt-10 rounded-[1.75rem] border border-line bg-white p-5 sm:mt-14 sm:p-8" aria-labelledby="includes-title">
      <h2 id="includes-title" className="text-2xl font-extrabold sm:text-3xl">{t.title}</h2>
      <p className="mt-1 text-ink-soft">{t.text}</p>
      <div className="mt-5 grid gap-6 sm:grid-cols-2 sm:gap-10">
        <div>
          <h3 className="text-base font-bold">{t.inTitle}</h3>
          <ul className="mt-3 space-y-2.5">
            {t.in.map((x) => (
              <li key={x} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-dark text-white" aria-hidden="true">
                  <Icon name="check" className="size-3" />
                </span>
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-base font-bold">{t.outTitle}</h3>
          <ul className="mt-3 space-y-2.5 text-ink-soft">
            {t.out.map((x, i) => (
              <li key={x} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-line text-ink-soft" aria-hidden="true">
                  <Icon name="plus" className="size-3" />
                </span>
                <span>
                  {x}
                  {i === t.out.length - 1 && floorGift && (
                    <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-copper-tint px-2 py-0.5 text-xs font-bold text-copper-deep">
                      <Icon name="gift" className="size-3" aria-hidden="true" /> {t.floorGift}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-5 border-t border-line pt-4 text-sm text-ink-soft">{t.footer}</p>
    </section>
  );
}
