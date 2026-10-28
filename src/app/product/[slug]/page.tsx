import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Configurator } from "@/components/configurator/Configurator";
import { Gallery } from "@/components/Gallery";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { ProductBuyBox } from "@/components/ProductBuyBox";
import { ReviewCard } from "@/components/ReviewCard";
import { Stars } from "@/components/Stars";
import { TrustBar } from "@/components/TrustBar";
import { getProduct, ltrSizes, plain, products, productsIn, reviews, site } from "@/lib/catalog";
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

const INCLUDED = [
  "שלדת אלומיניום מסיבית שאינה מחלידה",
  "קירות וגג מפנל מבודד – חום, קור ורעש",
  "דלת מעוצבת עם מנעול – בכל צד שתבחרו",
  "רצפה מוגבהת תוצרת איטליה",
  "חלון סקיילייט עליון לאור טבעי",
  "הרכבה ללא ברגים במחברים ייעודיים",
];

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  const d = product.dimensions;
  const options = fulfillmentOptions(product);
  const related = productsIn(product.category).filter((p) => p.slug !== product.slug).slice(0, 4);
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

  return (
    <div className="pb-10">
      <div className="container-x pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-ink-soft" aria-label="פירורי לחם">
          <Link href="/" className="hover:text-ink">ראשי</Link> / <Link href="/shop/" className="hover:text-ink">קטלוג</Link> / <span className="text-ink">{product.name}</span>
        </nav>
        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            {product.badge && <span className="mb-2 inline-block rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">{product.badge}</span>}
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{product.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-soft">
              <span className="flex items-center gap-1"><Stars value={5} className="size-4" /> {site.rating} ({site.reviewCount} ביקורות)</span>
              <span>· {product.warrantyYears} שנות אחריות</span>
              <span>· עד {site.maxPayments} תשלומים</span>
            </p>
          </div>
          <div className="text-end">
            <p className="text-sm text-ink-soft">מחיר בסיס</p>
            <p className="text-4xl font-black tracking-tight">{formatILS(product.price)}</p>
          </div>
        </header>
        {product.todo && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">⚠️ {product.todo}</p>}
      </div>

      <section className="container-x mt-8">
        {product.configurable ? (
          <Configurator product={product} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
            <div className="grid gap-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-sand">
                <Image src={product.images[0]} alt={product.name} fill priority sizes="(min-width:1024px) 58vw, 100vw" className="object-contain" />
              </div>
              {product.images.length > 1 && (
                <Gallery layout="strip" images={product.images.slice(1).map((src) => ({ src, alt: product.name }))} />
              )}
            </div>
            <ProductBuyBox product={product} />
          </div>
        )}
      </section>

      {product.configurable && product.images.length > 0 && (
        <section className="container-x mt-16">
          <h2 className="mb-5 text-2xl font-black sm:text-3xl">תמונות {product.name}</h2>
          <Gallery layout="strip" images={product.images.map((src, i) => ({ src, alt: `${product.name} – תמונה ${i + 1}` }))} />
        </section>
      )}

      <section className="container-x mt-16 grid gap-6 lg:grid-cols-3">
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold"><Icon name="ruler" className="text-brand-dark" /> מידות</h2>
          {d?.outer ? (
            <dl className="grid grid-cols-2 gap-y-2 text-[15px]">
              <dt className="text-ink-soft">רוחב חוץ</dt><dd className="font-bold">{formatCm(d.outer.width)}</dd>
              <dt className="text-ink-soft">עומק חוץ</dt><dd className="font-bold">{formatCm(d.outer.depth)}</dd>
              <dt className="text-ink-soft">גובה</dt><dd className="font-bold">{d.outer.heightMin === d.outer.heightMax ? formatCm(d.outer.heightMax) : `${d.outer.heightMin}–${formatCm(d.outer.heightMax)}`}</dd>
              {d.base && (<><dt className="text-ink-soft">מידות בסיס</dt><dd className="font-bold">{ltrSizes(`${d.base.width}×${d.base.depth}`)} ס"מ</dd></>)}
              {d.inner && (<><dt className="text-ink-soft">פנים בין קירות</dt><dd className="font-bold">{d.inner}</dd></>)}
              {d.wallHeight && (<><dt className="text-ink-soft">גובה קירות</dt><dd className="font-bold">{formatCm(d.wallHeight)}</dd></>)}
              {d.doorWidth && (<><dt className="text-ink-soft">רוחב דלת</dt><dd className="font-bold">{formatCm(d.doorWidth)}</dd></>)}
              {d.doorOpening && (<><dt className="text-ink-soft">פתח נטו</dt><dd className="font-bold">{formatCm(d.doorOpening)}</dd></>)}
              <dt className="text-ink-soft">שטח</dt><dd className="font-bold">{product.areaM2} מ"ר</dd>
            </dl>
          ) : (
            <p className="text-ink-soft">מידות: {product.sizeLabel} מ' ({product.areaM2} מ"ר).</p>
          )}
          {d?.approximate && <p className="mt-3 text-xs text-ink-soft">* מידות משוערות – TODO לאמת מול המפעל</p>}
        </div>
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold"><Icon name="check" className="text-brand-dark" /> מה כלול</h2>
          {product.category === "modubox" ? (
            <ul className="space-y-2.5">
              {INCLUDED.map((t) => <li key={t} className="flex gap-2"><Icon name="check" className="mt-0.5 size-5 shrink-0 text-brand" /> {t}</li>)}
            </ul>
          ) : (
            <p className="leading-8 text-ink-soft">{product.shortDescription}</p>
          )}
        </div>
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold"><Icon name="truck" className="text-brand-dark" /> הובלה והתקנה</h2>
          <ul className="space-y-2.5">
            {options.map((o) => (
              <li key={o.id} className="flex justify-between gap-3">
                <span>{o.label}{o.note && o.id !== "deliveryAndInstallation" ? <span className="block text-xs text-ink-soft">{o.note}</span> : null}</span>
                <span className="shrink-0 font-bold">{o.price === null ? "בתיאום" : o.price === 0 ? "חינם" : formatILS(o.price)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-6 text-ink-soft">
            {options[0].note ? `${options[0].note} ` : ""}התקנה עד {site.installationDays} ימי עסקים. המשטח צריך להיות ישר, מפולס וקשיח. <Link href="/terms/" className="font-semibold text-brand-dark underline">תנאים מלאים</Link>
          </p>
        </div>
      </section>

      <section className="container-x mt-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-black sm:text-3xl">לקוחות מספרים</h2>
          <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="flex items-center gap-2 font-bold text-brand-dark"><Icon name="google" className="size-4" /> {site.reviewCount} ביקורות בגוגל</a>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.slice(0, 3).map((r) => <ReviewCard key={r.name} {...r} />)}
        </div>
      </section>

      <section className="container-x mt-16"><TrustBar /></section>

      {related.length > 0 && (
        <section className="container-x mt-16">
          <h2 className="mb-6 text-2xl font-black sm:text-3xl">מידות נוספות</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
