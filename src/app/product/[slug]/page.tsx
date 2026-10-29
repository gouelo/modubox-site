import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Design3DButton } from "@/components/Design3DButton";
import { Gallery } from "@/components/Gallery";
import { Icon } from "@/components/Icon";
import { ProductBuyBox } from "@/components/ProductBuyBox";
import { Stars } from "@/components/Stars";
import { AddonBuilder } from "@/components/builder/AddonBuilder";
import { addonsFor, categories, getProduct, plain, products, productsIn, site } from "@/lib/catalog";
import { formatCm, formatILS } from "@/lib/format";
import { fulfillmentOptions } from "@/lib/pricing";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  return {
    title: `${plain(p.name)} – ${formatILS(p.price)}`,
    description: `${plain(p.name)}: ${p.shortDescription} ${p.warrantyYears} שנות אחריות, הובלה והתקנה עד הבית.`,
    openGraph: { images: [{ url: `/_img/${p.images[0].replace(/\.\w+$/, "")}-1600.webp` }] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  const d = product.dimensions;
  const delivery = fulfillmentOptions(product)[0];
  const sizes = productsIn(product.category);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: plain(product.name),
    description: product.shortDescription,
    brand: { "@type": "Brand", name: product.category === "gilboa" ? "Gilboa" : "Modubox" },
    image: product.images.map((i) => `${site.url}/_img/${i.replace(/\.\w+$/, "")}-1600.webp`),
    offers: { "@type": "Offer", priceCurrency: "ILS", price: product.price, availability: "https://schema.org/InStock", url: `${site.url}/product/${product.slug}/` },
    aggregateRating: { "@type": "AggregateRating", ratingValue: site.rating, reviewCount: site.reviewCount },
  };
  const spec: [string, string][] = [
    ["מידה (מטר)", product.sizeLabel],
    ["שטח", `${product.areaM2} מ"ר`],
    ...(d?.outer
      ? ([
          ["מידות חוץ", `${formatCm(d.outer.width)} × ${formatCm(d.outer.depth)}`],
          ["גובה", d.outer.heightMin === d.outer.heightMax ? formatCm(d.outer.heightMax) : `${d.outer.heightMin}–${formatCm(d.outer.heightMax)}`],
        ] as [string, string][])
      : []),
    ...(d?.doorOpening ? ([["פתח דלת", formatCm(d.doorOpening)]] as [string, string][]) : []),
    ["אחריות", `${product.warrantyYears} שנים`],
    ["הובלה והתקנה", delivery.price === null ? "בתיאום" : delivery.price === 0 ? "כלול" : formatILS(delivery.price)],
  ];

  const configurable = product.configurable && addonsFor(product).length > 0;
  const chips: [string, string][] = [
    ["מידה", product.sizeLabel],
    ["שטח", `${product.areaM2} מ"ר`],
    ...(d?.outer ? ([["גובה", formatCm(d.outer.heightMax)]] as [string, string][]) : []),
    ["אחריות", `${product.warrantyYears} שנים`],
  ];
  const range = categories.find((c) => c.id === product.category);

  return (
    <div className="container-x pb-32 pt-3 sm:pt-6 lg:pb-0">
      <nav className="text-sm text-ink-soft" aria-label="פירורי לחם">
        <Link href="/shop/" className="hover:text-ink">קטלוג</Link>
        <span className="mx-2 text-ink/30">/</span>
        <span>{range?.title}</span>
      </nav>

      <div className="mt-3 grid gap-6 lg:mt-5 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
        <div className="grid content-start gap-3">
          <div className="relative -mx-5 aspect-[4/3] overflow-hidden bg-sand sm:mx-0 sm:rounded-[2rem]">
            <Image src={product.images[0]} alt={product.name} fill priority sizes="(min-width:1024px) 58vw, 100vw" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/50 to-transparent" />
            {product.badge && <span className="absolute top-3 start-3 rounded-full bg-copper px-3 py-1 text-xs font-bold text-white">{product.badge}</span>}
            <span className="absolute bottom-3 end-4 font-display text-5xl font-extrabold text-white drop-shadow-lg sm:text-6xl" dir="ltr">{product.sizeLabel}</span>
          </div>
          {product.images.length > 1 && (
            <Gallery layout="strip" images={product.images.map((src, i) => ({ src, alt: `${product.name} – תמונה ${i + 1}` }))} />
          )}
        </div>

        <div className="lg:self-center">
          <p className="eyebrow">{range?.subtitle}</p>
          <h1 className="mt-2 text-[2.4rem] font-extrabold leading-[1.05] sm:text-5xl">{product.name}</h1>
          <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <Stars value={5} className="size-3.5" /> {site.rating} · {site.reviewCount} ביקורות בגוגל
          </a>
          <div className="mt-5 flex items-end gap-3">
            <p className="font-display text-5xl font-extrabold leading-none tabular-nums">{formatILS(product.price)}</p>
            <p className="pb-1 text-sm leading-tight text-ink-soft">כולל מע&quot;מ<br />עד {site.maxPayments} תשלומים</p>
          </div>
          {product.todo && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">⚠️ {product.todo}</p>}
          <p className="mt-4 leading-7 text-ink-soft">{product.shortDescription}</p>

          <ul className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
            {chips.map(([k, v]) => (
              <li key={k} className="shrink-0 rounded-2xl bg-sand px-4 py-2.5">
                <span className="block text-xs text-ink-soft">{k}</span>
                <span className="block font-bold">{v}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-3">
            {configurable ? (
              <a href="#build" className="btn-primary w-full py-4 text-base">
                בחירת תוספות והוספה לסל <Icon name="chevron" className="size-4" />
              </a>
            ) : (
              <ProductBuyBox product={product} />
            )}
            <Design3DButton product={product} variant="tile" />
          </div>
        </div>
      </div>

      {configurable && (
        <div className="mt-10 sm:mt-14">
          <AddonBuilder product={product} sizes={sizes} />
        </div>
      )}

      <section className="mt-12 grid gap-6 sm:mt-16 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
        <div>
          <h2 className="text-3xl font-extrabold">מפרט</h2>
          <p className="mt-2 text-ink-soft">
            <Icon name="truck" className="me-1 inline size-4 align-[-2px] text-brand-dark" /> הובלה והתקנה נבחרות בסל · <Link href="/terms/" className="underline">תנאים</Link> · <Link href="/warranty/" className="underline">אחריות</Link>
          </p>
        </div>
        <div>
          <dl className="divide-y divide-line border-y border-line text-[15px]">
            {spec.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="text-end font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          {d?.approximate && <p className="mt-2 text-xs text-ink-soft">* מידות משוערות – TODO לאמת מול המפעל</p>}
        </div>
      </section>

      {!configurable && sizes.length > 1 && (
        <section className="mt-12">
          <h2 className="mb-3 text-2xl font-extrabold">מידות נוספות</h2>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
            {sizes.map((p) => (
              <Link
                key={p.slug}
                href={`/product/${p.slug}/`}
                aria-current={p.slug === product.slug ? "page" : undefined}
                className={`shrink-0 rounded-2xl border px-4 py-2 text-center transition ${p.slug === product.slug ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}
              >
                <span className="block font-black" dir="ltr">{p.sizeLabel}</span>
                <span className={`block text-xs ${p.slug === product.slug ? "text-white/70" : "text-ink-soft"}`}>{formatILS(p.price)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
