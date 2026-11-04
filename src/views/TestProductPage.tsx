"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { lp } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { useCart } from "@/lib/cart-store";
import { getProduct } from "@/lib/catalog";
import { formatILS } from "@/lib/format";

/** The hidden test product's page: one button that puts it in the cart (and nothing else) and goes to the cart. */
export function TestProductPage({ slug }: { slug: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const { items, add, clear } = useCart();
  const product = getProduct(slug, locale)!;

  const buy = () => {
    if (!(items.length === 1 && items[0].slug === slug)) {
      clear();
      add(slug, {}, "deliveryAndInstallation");
    }
    router.push(lp(locale, "/cart/"));
  };

  return (
    <div className="container-x max-w-xl py-14">
      <div className="rounded-3xl bg-sand p-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-ink text-white" aria-hidden="true"><Icon name="card" className="size-8" /></span>
        <h1 className="mt-4 text-3xl font-extrabold">{product.name}</h1>
        <p className="mt-2 text-ink-soft">{product.shortDescription}</p>
        <p className="mt-4 text-4xl font-black">{formatILS(product.price, locale)}</p>
        <button type="button" onClick={buy} className="btn-brand mt-6 w-full py-4 text-base">{t.common.addToCart}</button>
      </div>
    </div>
  );
}
