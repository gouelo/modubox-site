import Image from "next/image";
import Link from "next/link";
import { lp, type Locale } from "@/i18n";
import type { FaqImage, FaqItem } from "@/lib/catalog";
import { CustomSizeNote } from "./CustomSize";
import { Icon } from "./Icon";
import { MaterialsPhoto } from "./Materials";

/** A photo in a frame of its own ratio, so it shows whole. */
export function FaqPhoto({ image, sizes, className = "" }: { image: FaqImage; sizes: string; className?: string }) {
  return (
    <figure className={className}>
      <div className="relative overflow-hidden rounded-2xl bg-sand ring-1 ring-line" style={{ aspectRatio: image.ratio ?? "16/9" }}>
        <Image src={image.src} alt={image.alt} fill sizes={sizes} className="object-cover" />
      </div>
      {image.caption && <figcaption className="mt-2 text-sm text-ink-soft">{image.caption}</figcaption>}
    </figure>
  );
}

function Answer({ item, locale }: { item: FaqItem; locale: Locale }) {
  const photos = Array.isArray(item.media) ? item.media : [];
  return (
    <div className="pb-6">
      <p className="leading-8 text-ink-soft">{item.a}</p>
      {item.link && (
        <Link href={lp(locale, item.link.href)} className="mt-3 inline-flex items-center gap-1 font-bold text-brand-dark hover:underline">
          {item.link.label} <Icon name="arrow" className="size-4" />
        </Link>
      )}
      {item.cta === "custom-size" && <CustomSizeNote locale={locale} className="mt-4" />}
      {item.media === "materials" && (
        <div className="-mx-3 mt-5 sm:mx-0">
          <MaterialsPhoto locale={locale} sizes="(min-width:768px) 42rem, 100vw" />
        </div>
      )}
      {photos.length > 0 && (
        <div className={`mt-5 grid items-start gap-3 ${photos.length > 1 ? "grid-cols-2" : ""}`}>
          {photos.map((m) => (
            <FaqPhoto
              key={m.src}
              image={m}
              sizes={photos.length > 1 ? "(min-width:768px) 21rem, 50vw" : "(min-width:768px) 42rem, 100vw"}
              className={photos.length === 1 && m.ratio === "3/4" ? "max-w-[18rem]" : ""}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Questions as an accordion; answers may carry a link, photos or the custom-size card. */
export function Faq({ items, locale }: { items: FaqItem[]; locale: Locale }) {
  return (
    <div className="divide-y divide-line rounded-3xl border border-line bg-white shadow-soft">
      {items.map((f) => (
        <details key={f.q} open={f.open} className="group px-5 py-1 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-lg font-bold">
            {f.q}
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sand transition group-open:rotate-45 group-open:bg-brand group-open:text-white">
              <Icon name="plus" className="size-4" />
            </span>
          </summary>
          <Answer item={f} locale={locale} />
        </details>
      ))}
    </div>
  );
}
