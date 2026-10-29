import Image from "next/image";
import Link from "next/link";
import { formatILS } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Footprint } from "./Footprint";
import { Icon } from "./Icon";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const delivery = product.fulfillment.deliveryAndInstallation;
  return (
    <Link
      href={`/product/${product.slug}/`}
      className="group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          priority={priority}
          sizes="(min-width:1024px) 25vw, (min-width:640px) 45vw, 90vw"
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        {product.badge && (
          <span className="absolute top-3 start-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white shadow">{product.badge}</span>
        )}
        <span className="absolute bottom-2 end-2 rounded-lg bg-white/95 px-2 py-0.5 font-black shadow sm:bottom-3 sm:end-3 sm:px-2.5 sm:py-1 sm:text-lg" dir="ltr">
          {product.sizeLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-extrabold leading-snug sm:text-base">{product.name}</h3>
            <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">{product.areaM2} מ"ר{product.dimensions?.outer ? ` · גובה עד ${Math.round(product.dimensions.outer.heightMax)} ס"מ` : ""}</p>
          </div>
          <Footprint w={product.widthM} d={product.depthM} className="hidden size-12 shrink-0 text-ink sm:block" />
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-xl font-black tracking-tight sm:text-2xl">{formatILS(product.price)}</p>
            <p className="text-xs text-ink-soft">
              {delivery === null ? "הובלה בתיאום" : delivery === 0 ? "כולל הובלה והרכבה" : `+ הובלה והתקנה ${formatILS(delivery)}`}
            </p>
          </div>
          <span className="hidden size-10 place-items-center rounded-full bg-ink text-white transition group-hover:bg-brand sm:grid">
            <Icon name="arrow" className="size-5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
