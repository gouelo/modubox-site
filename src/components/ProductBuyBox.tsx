"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { site } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { fulfillmentOptions, quote } from "@/lib/pricing";
import type { FulfillmentId, Product } from "@/lib/types";
import { configMessage, waLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";

/** Buy box for products without a configurator (Gilboa, toilets, guard booth). */
export function ProductBuyBox({ product }: { product: Product }) {
  const options = fulfillmentOptions(product);
  const [f, setF] = useState<FulfillmentId>(options[0].id);
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);
  const chosen = options.find((o) => o.id === f)!;
  const total = product.price + (chosen.payToInstaller ? 0 : chosen.price ?? 0);

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <p className="text-lg leading-8 text-ink-soft">{product.shortDescription}</p>
      <fieldset className="space-y-2">
        <legend className="mb-2 font-extrabold">הובלה והתקנה</legend>
        {options.map((o) => (
          <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${f === o.id ? "border-ink bg-sand" : "border-line"}`}>
            <input type="radio" name="fulfillment" className="size-5 accent-ink" checked={f === o.id} onChange={() => setF(o.id)} />
            <span className="flex-1">
              <span className="block font-bold">{o.label}</span>
              {o.note && <span className="block text-xs text-ink-soft">{o.note}</span>}
            </span>
            <span className="font-bold">{o.price === null ? "בתיאום" : o.price === 0 ? "חינם" : formatILS(o.price)}</span>
          </label>
        ))}
      </fieldset>
      <div className="card p-5">
        <div className="flex items-end justify-between">
          <span className="font-bold">סה"כ</span>
          <span className="text-3xl font-black">{formatILS(total)}</span>
        </div>
        {chosen.payToInstaller && chosen.price ? <p className="mt-1 text-sm text-ink-soft">+ {formatILS(chosen.price)} הובלה והתקנה – לתשלום למתקינים</p> : null}
        <p className="mt-1 text-sm text-ink-soft">עד {site.maxPayments} תשלומים</p>
        <div className="mt-4 grid gap-2">
          <button type="button" className="btn-primary w-full" onClick={() => { add(product.slug, {}, f); setAdded(true); }}>
            <Icon name="cart" /> {added ? "נוסף לסל ✓" : "הוספה לסל"}
          </button>
          {added && <Link href="/cart/" className="btn-ghost w-full">למעבר לסל</Link>}
          <a href={waLink(configMessage(product, quote(product, {})))} target="_blank" rel="noopener" className="btn-wa w-full">
            <Icon name="whatsapp" /> שאלו על המוצר בוואטסאפ
          </a>
        </div>
      </div>
    </div>
  );
}
