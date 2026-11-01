import Image from "next/image";
import Link from "next/link";
import { dict, lp, type Locale } from "@/i18n";
import { plain } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * A size in the catalog, centred: its kind ("מחסן מודובוקס"), then the size
 * once, big, with its area under it; then, past a hairline, the price with
 * delivery and installation under it (round 8: the area belongs to the size,
 * "+ הובלה והתקנה" to the price). The photo keeps its own 16:9 frame, so the whole shed shows.
 */
export function ProductCard({ product, locale, priority = false, sizes = "(min-width:1024px) 25vw, (min-width:640px) 45vw, 85vw" }: { product: Product; locale: Locale; priority?: boolean; sizes?: string }) {
  const t = dict(locale);
  const delivery = product.fulfillment.deliveryAndInstallation;
  /** the product's kind without its size ("מחסן מודובוקס"), so the size shows once */
  const kind = plain(product.name).replace(plain(product.sizeLabel), "").replace(/\s+/g, " ").trim();
  return (
    <Link href={lp(locale, `/product/${product.slug}/`)} className="group flex flex-col">
      <div className="relative aspect-video overflow-hidden rounded-3xl bg-sand shadow-soft transition duration-500 ease-(--ease-out-expo) group-hover:shadow-lift">
        <Image
          src={product.images[0]}
          alt=""
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover transition duration-1000 ease-(--ease-out-expo) group-hover:scale-[1.03]"
        />
        {product.badge && (
          <span className="absolute top-3 start-3 rounded-full bg-copper-deep px-3 py-1 text-xs font-bold text-white shadow">{product.badge}</span>
        )}
      </div>
      <div className="px-1 pt-4 text-center">
        <h3 className="relative">
          <span className="sr-only">{product.name}</span>
          {kind && <span aria-hidden="true" className="block text-sm font-bold text-ink-soft">{kind}</span>}
          <span aria-hidden="true" dir="ltr" className="mt-1 inline-block font-display text-3xl font-extrabold leading-none sm:text-[2.1rem]">{product.sizeLabel}</span>
        </h3>
        <p className="mt-1.5 text-sm text-ink-soft">{t.common.area(product.areaM2)}</p>
        <span className="mx-auto mt-3 block h-px w-10 bg-line transition-all duration-500 group-hover:w-16 group-hover:bg-brand" aria-hidden="true" />
        <p className="mt-3 text-xl font-black leading-none tabular-nums sm:text-2xl">{formatILS(product.price, locale)}</p>
        <p className="mt-1.5 text-xs text-ink-soft">
          {delivery === null ? (
            t.productCard.onRequest
          ) : delivery === 0 ? (
            t.productCard.included
          ) : (
            <>
              {t.productCard.plus} <span className="font-bold tabular-nums text-ink">{formatILS(delivery, locale)}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
