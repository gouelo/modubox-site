"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { defaultFulfillment } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import { productMessage, waLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";

/** Add to cart at the base price; delivery and installation are chosen in the cart. */
export function ProductBuyBox({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      {added ? (
        <Link href="/cart/" className="btn-primary w-full py-4 text-base">
          נוסף ✓ למעבר לסל <Icon name="arrow" className="size-4" />
        </Link>
      ) : (
        <button type="button" className="btn-primary w-full py-4 text-base" onClick={() => { add(product.slug, {}, defaultFulfillment(product)); setAdded(true); }}>
          <Icon name="cart" /> הוספה לסל
        </button>
      )}
      <a href={waLink(productMessage(product))} target="_blank" rel="noopener" className="btn-wa aspect-square p-0 sm:aspect-auto sm:px-5" aria-label="שאלו על המוצר בוואטסאפ">
        <Icon name="whatsapp" className="size-6" /> <span className="hidden sm:inline">וואטסאפ</span>
      </a>
    </div>
  );
}
