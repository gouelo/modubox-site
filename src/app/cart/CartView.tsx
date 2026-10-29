"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useCart } from "@/lib/cart-store";
import { site } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { fulfillmentOptions, summarizeCart, type CartSummary } from "@/lib/pricing";
import { useHydrated } from "@/lib/use-hydrated";
import { orderMessage, waLink } from "@/lib/whatsapp";

export function Totals({ cart }: { cart: CartSummary }) {
  return (
    <dl className="space-y-2 text-[15px]">
      <div className="flex justify-between"><dt className="text-ink-soft">מוצרים</dt><dd className="font-semibold">{formatILS(cart.itemsTotal)}</dd></div>
      <div className="flex justify-between"><dt className="text-ink-soft">הובלה והתקנה</dt><dd className="font-semibold">{cart.fulfillmentTotal ? formatILS(cart.fulfillmentTotal) : "—"}</dd></div>
      <div className="flex items-end justify-between border-t border-line pt-3">
        <dt className="font-bold">סה"כ לתשלום</dt>
        <dd className="text-3xl font-black tracking-tight">{formatILS(cart.total)}</dd>
      </div>
      {cart.payLater > 0 && <p className="text-sm text-ink-soft">+ {formatILS(cart.payLater)} הובלה והתקנה – לתשלום למתקינים ביום ההתקנה</p>}
      {cart.hasOnRequest && <p className="text-sm font-semibold text-brand-dark">* חלק מהפריטים במחיר בתיאום – נציג יאשר מולכם</p>}
      <p className="text-xs text-ink-soft">המחירים כוללים מע"מ · עד {site.maxPayments} תשלומים</p>
    </dl>
  );
}

export function CartView() {
  const hydrated = useHydrated();
  const { items, update, remove } = useCart();
  const cart = summarizeCart(items);

  if (!hydrated) return <div className="mt-10 h-64 animate-pulse rounded-3xl bg-sand" />;

  if (cart.lines.length === 0)
    return (
      <div className="mt-10 rounded-3xl bg-sand p-10 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-ink/40"><Icon name="cart" className="size-8" /></span>
        <p className="mt-4 text-xl font-extrabold">הסל ריק</p>
        <p className="mt-1 text-ink-soft">בחרו מידה מהקטלוג – זה לוקח דקה.</p>
        <Link href="/shop/" className="btn-primary mt-6">לקטלוג</Link>
      </div>
    );

  return (
    <div className="mt-8 grid gap-8 pb-28 lg:grid-cols-[1.6fr_1fr] lg:pb-0">
      <ul className="space-y-4">
        <AnimatePresence initial={false}>
          {cart.lines.map((l) => {
            const options = fulfillmentOptions(l.product);
            const editHref = `/product/${l.product.slug}/`;
            return (
              <motion.li key={l.item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} className="card p-4 sm:p-5">
                <div className="flex gap-4">
                  <Link href={editHref} className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-sand sm:size-28">
                    <Image src={l.product.images[0]} alt={l.product.name} fill sizes="112px" className="object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={editHref} className="font-extrabold leading-snug hover:underline">{l.product.name}</Link>
                      <button type="button" onClick={() => remove(l.item.id)} aria-label={`הסרת ${l.product.name}`} className="grid size-9 shrink-0 place-items-center rounded-full text-ink/50 hover:bg-sand hover:text-red-600">
                        <Icon name="trash" className="size-4" />
                      </button>
                    </div>
                    {l.quote.lines.length > 1 && (
                      <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
                        {l.quote.lines.slice(1).map((x) => (
                          <li key={x.id}>+ {x.label}{x.qty > 1 ? ` ×${x.qty}` : ""} {x.total === null ? "(בתיאום)" : x.total ? `(${formatILS(x.total)})` : ""}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1 rounded-full bg-sand p-1">
                        <button type="button" aria-label="הפחתת כמות" disabled={l.item.qty <= 1} onClick={() => update(l.item.id, { qty: l.item.qty - 1 })} className="grid size-8 place-items-center rounded-full bg-white disabled:opacity-30"><Icon name="minus" className="size-4" /></button>
                        <span className="w-7 text-center font-bold">{l.item.qty}</span>
                        <button type="button" aria-label="הוספת כמות" onClick={() => update(l.item.id, { qty: l.item.qty + 1 })} className="grid size-8 place-items-center rounded-full bg-white"><Icon name="plus" className="size-4" /></button>
                      </div>
                      <span className="text-xl font-black">{formatILS(l.itemsTotal)}</span>
                    </div>
                  </div>
                </div>
                <fieldset className="mt-4 border-t border-line pt-4">
                  <legend className="sr-only">הובלה והתקנה ל{l.product.name}</legend>
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold"><Icon name="truck" className="size-4 text-brand-dark" /> הובלה והתקנה</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {options.map((o) => (
                      <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${l.fulfillment.id === o.id ? "border-ink bg-sand" : "border-line"}`}>
                        <input type="radio" name={`f-${l.item.id}`} className="size-4 accent-ink" checked={l.fulfillment.id === o.id} onChange={() => update(l.item.id, { fulfillment: o.id })} />
                        <span className="flex-1 font-semibold">{o.label}{o.payToInstaller ? <span className="block text-xs font-normal text-ink-soft">תשלום למתקינים</span> : null}</span>
                        <span className="font-bold">{o.price === null ? "בתיאום" : o.price === 0 ? "חינם" : formatILS(o.price * l.item.qty)}</span>
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
          <h2 className="mb-4 text-lg font-extrabold">סיכום הזמנה</h2>
          <Totals cart={cart} />
          <div className="mt-5 grid gap-2">
            <Link href="/checkout/" className="btn-primary w-full py-4 text-base">לתשלום מאובטח <Icon name="arrow" className="size-4" /></Link>
            <a href={waLink(orderMessage(cart))} target="_blank" rel="noopener" className="btn-wa w-full"><Icon name="whatsapp" /> הזמנה בוואטסאפ</a>
            <a href={`tel:${site.phone}`} className="btn-ghost w-full"><Icon name="phone" /> הזמנה בטלפון</a>
          </div>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-ink-soft">סה"כ כולל הובלה</p>
            <p className="text-xl font-black">{formatILS(cart.total)}</p>
          </div>
          <Link href="/checkout/" className="btn-primary h-12 px-6">לתשלום</Link>
        </div>
      </div>
    </div>
  );
}
