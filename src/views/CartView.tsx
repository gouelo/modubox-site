"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { CouponBox } from "@/components/CouponBox";
import { GiftPicker } from "@/components/GiftPicker";
import { Icon } from "@/components/Icon";
import { lp } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { useCart } from "@/lib/cart-store";
import { catalog, productPath } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { fulfillmentOptions, summarizeCart, type CartSummary } from "@/lib/pricing";
import { useCoupon, type CouponCheck } from "@/lib/use-coupon";
import { useHydrated } from "@/lib/use-hydrated";
import { orderMessage, waLink } from "@/lib/whatsapp";

/** The cart's totals; `discount` is a coupon the server accepted. */
export function Totals({ cart, discount }: { cart: CartSummary; discount?: { code: string; amount: number } | null }) {
  const locale = useLocale();
  const t = useT().cart;
  const ils = (n: number) => formatILS(n, locale);
  return (
    <div className="space-y-2 text-[15px]">
      <dl className="space-y-2">
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t.products}</dt>
          <dd className="font-semibold">{ils(cart.itemsTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t.delivery}</dt>
          <dd className="font-semibold">{cart.fulfillmentTotal ? ils(cart.fulfillmentTotal) : "—"}</dd>
        </div>
        {discount && discount.amount > 0 && (
          <div className="flex justify-between font-semibold text-brand-dark">
            <dt>{t.coupon.line(discount.code)}</dt>
            <dd dir="ltr">−{ils(discount.amount)}</dd>
          </div>
        )}
        <div className="flex items-end justify-between border-t border-line pt-3">
          <dt className="font-bold">{t.total}</dt>
          <dd className="text-3xl font-black tracking-tight">{ils(cart.total - (discount?.amount ?? 0))}</dd>
        </div>
      </dl>
      {cart.payLater > 0 && <p className="text-sm text-ink-soft">{t.payLater(ils(cart.payLater))}</p>}
      {cart.hasOnRequest && <p className="text-sm font-semibold text-brand-dark">{t.onRequest}</p>}
      <p className="text-xs text-ink-soft">{t.vat(catalog(locale).site.maxPayments)}</p>
    </div>
  );
}

/** A coupon check's discount, when the server accepted it. */
export function couponDiscount(c: CouponCheck | "checking" | null): { code: string; amount: number } | null {
  return c && c !== "checking" && c.status === "ok" ? { code: c.code, amount: c.discount } : null;
}

/** The cart page's heading and contents. */
export function CartPage() {
  const t = useT();
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{t.meta.cart.title}</h1>
      <CartView />
    </div>
  );
}

export function CartView() {
  const hydrated = useHydrated();
  const { items, update, remove } = useCart();
  const locale = useLocale();
  const t = useT();
  const c = t.cart;
  const site = catalog(locale).site;
  const ils = (n: number) => formatILS(n, locale);
  const cart = summarizeCart(items, locale);
  const coupon = useCoupon(items, locale);
  const discount = couponDiscount(coupon);

  if (!hydrated) return <div className="mt-10 h-64 animate-pulse rounded-3xl bg-sand" />;

  if (cart.lines.length === 0)
    return (
      <div className="mt-10 rounded-3xl bg-sand p-10 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-ink/40" aria-hidden="true"><Icon name="cart" className="size-8" /></span>
        <h2 className="mt-4 text-xl font-extrabold">{c.empty}</h2>
        <p className="mt-1 text-ink-soft">{c.emptyText}</p>
        <Link href={lp(locale, "/shop/")} className="btn-primary mt-6">{t.common.toCatalog}</Link>
      </div>
    );

  return (
    <div className="mt-8 grid gap-8 pb-28 lg:grid-cols-[1.6fr_1fr] lg:pb-0">
      <h2 className="sr-only">{c.products}</h2>
      <ul className="space-y-4">
        <AnimatePresence initial={false}>
          {cart.lines.map((l) => {
            const options = fulfillmentOptions(l.product);
            const editHref = lp(locale, productPath(l.product));
            const extras = l.quote.lines.slice(1).filter((x) => !x.gift);
            return (
              <motion.li key={l.item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: locale === "he" ? 40 : -40 }} className="card p-4 sm:p-5">
                <div className="flex gap-4">
                  <Link href={editHref} className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-sand sm:size-28" tabIndex={-1} aria-hidden="true">
                    <Image src={l.product.images[0]} alt="" fill sizes="112px" className="object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3>
                        <Link href={editHref} className="font-extrabold leading-snug hover:underline">
                          {l.product.name}
                        </Link>
                      </h3>
                      <button type="button" onClick={() => remove(l.item.id)} aria-label={c.remove(l.product.name)} className="grid size-9 shrink-0 place-items-center rounded-full text-ink/60 hover:bg-sand hover:text-red-600">
                        <Icon name="trash" className="size-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1 rounded-full bg-sand p-1" role="group" aria-label={c.qty}>
                        <button type="button" aria-label={c.less} disabled={l.item.qty <= 1} onClick={() => update(l.item.id, { qty: l.item.qty - 1 })} className="grid size-8 place-items-center rounded-full bg-white disabled:opacity-30"><Icon name="minus" className="size-4" /></button>
                        <span className="w-7 text-center font-bold" aria-live="polite">{l.item.qty}</span>
                        <button type="button" aria-label={c.more} onClick={() => update(l.item.id, { qty: l.item.qty + 1 })} className="grid size-8 place-items-center rounded-full bg-white"><Icon name="plus" className="size-4" /></button>
                      </div>
                      <span className="text-xl font-black">{ils(l.itemsTotal)}</span>
                    </div>
                  </div>
                </div>
                {extras.length > 0 && (
                  <ul className="mt-4 space-y-1.5 rounded-2xl bg-sand p-3 text-[13px] leading-5 text-ink-soft">
                    <li className="flex justify-between gap-3 text-ink">
                      <span className="font-bold">{t.common.basePrice}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{ils(l.product.price)}</span>
                    </li>
                    {extras.map((x) => (
                      <li key={x.id} className="flex justify-between gap-3">
                        <span>
                          {x.label}
                          {x.qty > 1 ? ` ×${x.qty}` : ""}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {x.total === null ? <span className="text-copper-deep">{t.common.onRequest}</span> : x.total ? ils(x.total) : t.common.noExtra}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {l.quote.gift && (
                  <GiftPicker gift={l.quote.gift} product={l.product.name} id={l.item.id} onPick={(addon, choice) => update(l.item.id, { selections: { ...l.item.selections, [addon]: choice } })} />
                )}
                {l.item.design && (
                  <div className="mt-3 flex items-start gap-3 rounded-2xl border border-brand/25 bg-brand/5 p-3 text-[13px] leading-5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-petrol to-brand text-white" aria-hidden="true"><Icon name="cube" className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{c.designed}</p>
                      <p className="text-ink-soft">{l.item.design.exact ? c.designedExact : c.designedTodo}</p>
                    </div>
                    <a href={l.item.design.link} target="_blank" rel="noopener" className="shrink-0 self-center font-bold text-brand-dark underline-offset-2 hover:underline">{c.toDesign}</a>
                  </div>
                )}
                <fieldset className="mt-4 border-t border-line pt-4">
                  <legend className="sr-only">{c.deliveryFor(l.product.name)}</legend>
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold" aria-hidden="true"><Icon name="truck" className="size-4 text-brand-dark" /> {c.delivery}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {options.map((o) => (
                      <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${l.fulfillment.id === o.id ? "border-ink bg-sand" : "border-line"}`}>
                        <input type="radio" name={`f-${l.item.id}`} className="size-4 accent-ink" checked={l.fulfillment.id === o.id} onChange={() => update(l.item.id, { fulfillment: o.id })} />
                        <span className="flex-1 font-semibold">{o.label}{o.payToInstaller ? <span className="block text-xs font-normal text-ink-soft">{c.payToInstallers}</span> : null}</span>
                        <span className="font-bold">{o.price === null ? t.common.onRequest : o.price === 0 ? t.common.free : ils(o.price * l.item.qty)}</span>
                      </label>
                    ))}
                  </div>
                  {l.fulfillment.note && <p className="mt-2 text-xs text-ink-soft">{l.fulfillment.note}</p>}
                </fieldset>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="mb-4 text-lg font-extrabold">{c.summary}</h2>
          <Totals cart={cart} discount={discount} />
          <div className="mt-4">
            <CouponBox check={coupon} />
          </div>
          <div className="mt-5 grid gap-2">
            <Link href={lp(locale, "/checkout/")} className="btn-primary w-full py-4 text-base">{c.checkout} <Icon name="arrow" className="size-4" /></Link>
            <a href={waLink(orderMessage(cart, undefined, undefined, locale))} target="_blank" rel="noopener" className="btn-wa w-full"><Icon name="whatsapp" /> {c.orderWhatsapp}</a>
            <a href={`tel:${site.phone}`} className="btn-ghost w-full"><Icon name="phone" /> {c.orderPhone}</a>
          </div>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3 rounded-[1.4rem] bg-ink/95 p-2 ps-4 text-white shadow-lift ring-1 ring-white/10 backdrop-blur-md">
          <div className="flex-1">
            <p className="text-[11px] text-white/60">{c.totalWithDelivery}</p>
            <p className="text-xl font-black tabular-nums">{ils(cart.total - (discount?.amount ?? 0))}</p>
          </div>
          <Link href={lp(locale, "/checkout/")} className="btn h-12 bg-white px-6 text-ink">{c.pay} <Icon name="arrow" className="size-4" /></Link>
        </div>
      </div>
    </div>
  );
}
