import Image from "next/image";
import Link from "next/link";
import { plain } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * A size in the catalog, centred: the size once, big, then its kind, price,
 * area and delivery. The photo keeps its own 16:9 frame, so the whole shed shows.
 */
export function ProductCard({ product, priority = false, sizes = "(min-width:1024px) 25vw, (min-width:640px) 45vw, 85vw" }: { product: Product; priority?: boolean; sizes?: string }) {
  const delivery = product.fulfillment.deliveryAndInstallation;
  /** the product's kind without its size ("מחסן מודובוקס"), so the size shows once */
  const kind = plain(product.name).replace(plain(product.sizeLabel), "").replace(/\s+/g, " ").trim();
  return (
    <Link href={`/product/${product.slug}/`} className="group flex flex-col">
      <div className="relative aspect-video overflow-hidden rounded-3xl bg-sand shadow-soft transition duration-500 ease-(--ease-out-expo) group-hover:shadow-lift">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover transition duration-1000 ease-(--ease-out-expo) group-hover:scale-[1.03]"
        />
        {product.badge && (
          <span className="absolute top-3 start-3 rounded-full bg-copper px-3 py-1 text-xs font-bold text-white shadow">{product.badge}</span>
        )}
      </div>
      <div className="px-1 pt-4 text-center">
        <h3 className="relative font-display text-3xl font-extrabold leading-none sm:text-[2.1rem]">
          <span className="sr-only">{product.name}</span>
          <span aria-hidden="true" dir="ltr" className="inline-block">{product.sizeLabel}</span>
        </h3>
        {kind && <p className="mt-1.5 text-sm font-semibold text-ink-soft">{kind}</p>}
        <p className="mt-2 text-xl font-black tabular-nums sm:text-2xl">{formatILS(product.price)}</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {product.areaM2} מ&quot;ר · {delivery === null ? "הובלה והתקנה בתיאום" : delivery === 0 ? "כולל הובלה והתקנה" : `+ הובלה והתקנה ${formatILS(delivery)}`}
        </p>
      </div>
    </Link>
  );
}
