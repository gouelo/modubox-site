import Image from "next/image";
import Link from "next/link";
import { formatILS } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Icon } from "./Icon";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const delivery = product.fulfillment.deliveryAndInstallation;
  return (
    <Link href={`/product/${product.slug}/`} className="group flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-sand shadow-soft transition duration-500 ease-(--ease-out-expo) group-hover:shadow-lift">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          priority={priority}
          sizes="(min-width:1024px) 25vw, (min-width:640px) 45vw, 80vw"
          className="object-cover transition duration-1000 ease-(--ease-out-expo) group-hover:scale-[1.06]"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" />
        {product.badge && (
          <span className="absolute top-3 start-3 rounded-full bg-copper px-3 py-1 text-xs font-bold text-white shadow">{product.badge}</span>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 text-white sm:p-4">
          <span className="font-display text-[2rem] font-extrabold leading-none drop-shadow sm:text-5xl" dir="ltr">{product.sizeLabel}</span>
          <span className="hidden size-10 place-items-center rounded-full bg-white/15 backdrop-blur-md sm:grid transition duration-500 group-hover:bg-white group-hover:text-ink">
            <Icon name="arrow" className="size-4" />
          </span>
        </div>
      </div>
      <div className="px-1 pt-3">
        <h3 className="text-[15px] font-bold leading-snug text-ink-soft">{product.name}</h3>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-xl font-black tabular-nums sm:text-2xl">{formatILS(product.price)}</span>
          <span className="text-xs text-ink-soft">
            {product.areaM2} מ"ר · {delivery === null ? "הובלה בתיאום" : delivery === 0 ? "כולל הובלה" : `+ הובלה והתקנה ${formatILS(delivery)}`}
          </span>
        </p>
      </div>
    </Link>
  );
}
