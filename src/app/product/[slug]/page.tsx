import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Design3DButton } from "@/components/Design3DButton";
import { Gallery } from "@/components/Gallery";
import { Icon } from "@/components/Icon";
import { ProductBuyBox } from "@/components/ProductBuyBox";
import { Stars } from "@/components/Stars";
import { getProduct, plain, products, productsIn, site } from "@/lib/catalog";
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

  return (
    <div className="container-x pt-4 sm:pt-6">
      <nav className="text-sm text-ink-soft" aria-label="פירורי לחם">
        <Link href="/shop/" className="hover:text-ink">← קטלוג</Link>
      </nav>

      <div className="mt-3 grid gap-6 lg:mt-5 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
        <div className="grid content-start gap-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-sand">
            <Image src={product.images[0]} alt={product.name} fill priority sizes="(min-width:1024px) 58vw, 100vw" className="object-cover" />
            {product.badge && <span className="absolute top-3 start-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">{product.badge}</span>}
          </div>
          {product.images.length > 1 && (
            <Gallery layout="strip" images={product.images.map((src, i) => ({ src, alt: `${product.name} – תמונה ${i + 1}` }))} />
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <Stars value={5} className="size-3.5" /> {site.rating} ({site.reviewCount} ביקורות)
          </p>
          <p className="mt-4 text-4xl font-black tracking-tight">{formatILS(product.price)}</p>
          <p className="text-sm text-ink-soft">כולל מע&quot;מ · עד {site.maxPayments} תשלומים</p>
          {product.todo && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">⚠️ {product.todo}</p>}

          <div className="mt-5 grid gap-3">
            <Design3DButton product={product} />
            <ProductBuyBox product={product} />
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
            <Icon name="truck" className="size-4 shrink-0" /> הובלה והתקנה נבחרות בסל · <Link href="/terms/" className="underline">תנאים</Link>
          </p>
          <p className="mt-5 leading-7 text-ink-soft">{product.shortDescription}</p>

          <dl className="mt-5 divide-y divide-line border-y border-line text-[15px]">
            {spec.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="text-end font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          {d?.approximate && <p className="mt-2 text-xs text-ink-soft">* מידות משוערות – TODO לאמת מול המפעל</p>}
        </div>
      </div>

      {sizes.length > 1 && (
        <section className="mt-12">
          <h2 className="mb-3 font-extrabold">מידות נוספות</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
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
