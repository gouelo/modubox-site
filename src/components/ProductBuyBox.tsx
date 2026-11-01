"use client";
import Link from "next/link";
import { useState } from "react";
import { lp } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { useCart } from "@/lib/cart-store";
import { defaultFulfillment } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import { productMessage, waLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";

/** Add to cart at the base price; delivery and installation are chosen in the cart. */
export function ProductBuyBox({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);
  const locale = useLocale();
  const t = useT();

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      {added ? (
        <Link href={lp(locale, "/cart/")} className="btn-primary w-full py-4 text-base">
          {t.product.added} <Icon name="arrow" className="size-4" />
        </Link>
      ) : (
        <button type="button" className="btn-primary w-full py-4 text-base" onClick={() => { add(product.slug, {}, defaultFulfillment(product)); setAdded(true); }}>
          <Icon name="cart" /> {t.common.addToCart}
        </button>
      )}
      <a href={waLink(productMessage(product))} target="_blank" rel="noopener" className="btn-wa aspect-square p-0 sm:aspect-auto sm:px-5" aria-label={t.product.askWhatsapp}>
        <Icon name="whatsapp" className="size-6" /> <span className="hidden sm:inline">{t.common.whatsapp}</span>
      </a>
    </div>
  );
}
