import Image from "next/image";
import Link from "next/link";
import { formatILS } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Icon } from "./Icon";

/** A size in the catalog. The photo keeps its own 16:9 frame, so the whole shed shows. */
export function ProductCard({ product, priority = false, sizes = "(min-width:1024px) 25vw, (min-width:640px) 45vw, 85vw" }: { product: Product; priority?: boolean; sizes?: string }) {
  const delivery = product.fulfillment.deliveryAndInstallation;
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
      <div className="flex items-start justify-between gap-3 px-1 pt-3">
        <div className="min-w-0">
          <p className="font-display text-3xl font-extrabold leading-none sm:text-[2.1rem]" dir="ltr">
            <span className="inline-block">{product.sizeLabel}</span>
          </p>
          <h3 className="mt-1.5 text-sm font-semibold leading-snug text-ink-soft">{product.name}</h3>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line transition duration-500 group-hover:border-ink group-hover:bg-ink group-hover:text-white">
          <Icon name="arrow" className="size-4" />
        </span>
      </div>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 px-1">
        <span className="text-xl font-black tabular-nums sm:text-2xl">{formatILS(product.price)}</span>
        <span className="text-xs text-ink-soft">
          {product.areaM2} מ&quot;ר · {delivery === null ? "הובלה בתיאום" : delivery === 0 ? "כולל הובלה" : `+ הובלה והתקנה ${formatILS(delivery)}`}
        </span>
      </p>
    </Link>
  );
}
