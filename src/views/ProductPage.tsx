import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomSizeNote } from "@/components/CustomSize";
import { Design3DButton } from "@/components/Design3DButton";
import { Gallery } from "@/components/Gallery";
import { Icon } from "@/components/Icon";
import { Materials } from "@/components/Materials";
import { ProductBuyBox } from "@/components/ProductBuyBox";
import { Stars } from "@/components/Stars";
import { AddonBuilder } from "@/components/builder/AddonBuilder";
import { dict, lp, type Locale } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { addonsFor, catalog, getProduct, plain, products, productsIn } from "@/lib/catalog";
import { formatCm, formatILS } from "@/lib/format";
import { fulfillmentOptions } from "@/lib/pricing";
import { business } from "@/lib/seo/settings";
import { loadSeo } from "@/lib/seo/store";

export function productParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export function productMeta(locale: Locale, slug: string): Metadata {
  const p = getProduct(slug, locale);
  if (!p) return {};
  const m = dict(locale).meta.product;
  return pageMeta(locale, `/product/${slug}/`, {
    title: m.title(plain(p.name), formatILS(p.price, locale)),
    description: m.description(plain(p.name), p.shortDescription, p.warrantyYears),
    openGraph: { images: [{ url: `/_img/${p.images[0].replace(/\.\w+$/, "")}-1600.webp` }] },
  });
}

export async function ProductPage({ locale, slug }: { locale: Locale; slug: string }) {
  const product = getProduct(slug, locale);
  if (!product) notFound();
  // the admin's key facts for this page, and the business's rating (Content in the admin)
  const seo = await loadSeo();
  const facts = (seo.pages.get(lp(locale, `/product/${slug}/`))?.keyFacts ?? []).filter((f) => f.label && f.value);
  const biz = business(seo.business, locale);
  const { site, allCategories } = catalog(locale);
  const t = dict(locale);
  const tp = t.product;
  const r = tp.rows;
  const ils = (n: number) => formatILS(n, locale);
  const cm = (n: number) => formatCm(n, locale);
  const d = product.dimensions;
  const delivery = fulfillmentOptions(product)[0];
  const sizes = productsIn(product.category, locale);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: plain(product.name),
    description: product.shortDescription,
    brand: { "@type": "Brand", name: product.category === "gilboa" ? "Gilboa" : "Modubox" },
    image: product.images.map((i) => `${site.url}/_img/${i.replace(/\.\w+$/, "")}-1600.webp`),
    offers: { "@type": "Offer", priceCurrency: "ILS", price: product.price, availability: "https://schema.org/InStock", url: `${site.url}${lp(locale, `/product/${product.slug}/`)}` },
    aggregateRating: { "@type": "AggregateRating", ratingValue: biz.rating, reviewCount: biz.reviewCount },
    ...(facts.length ? { additionalProperty: facts.map((f) => ({ "@type": "PropertyValue", name: f.label, value: f.value })) } : {}),
  };
  const spec: [string, string][] = [
    [r.size, product.sizeLabel],
    [r.area, t.common.m2(product.areaM2)],
    ...(d?.outer
      ? ([
          [r.outer, `${cm(d.outer.width)} × ${cm(d.outer.depth)}`],
          [r.height, d.outer.heightMin === d.outer.heightMax ? cm(d.outer.heightMax) : `${d.outer.heightMin}–${cm(d.outer.heightMax)}`],
        ] as [string, string][])
      : []),
    ...(d?.doorOpening ? ([[r.door, cm(d.doorOpening)]] as [string, string][]) : []),
    [r.warranty, t.common.years(product.warrantyYears)],
    [r.delivery, delivery.price === null ? t.common.onRequest : delivery.price === 0 ? t.common.included : ils(delivery.price)],
  ];

  const configurable = product.configurable && addonsFor(product).length > 0;
  const chips: [string, string][] = [
    [r.sizeShort, product.sizeLabel],
    [r.area, t.common.m2(product.areaM2)],
    ...(d?.outer ? ([[r.height, cm(d.outer.heightMax)]] as [string, string][]) : []),
    [r.warranty, t.common.years(product.warrantyYears)],
  ];
  const range = allCategories.find((c) => c.id === product.category);

  return (
    <div className="container-x pb-32 pt-3 sm:pt-6 lg:pb-0">
      <nav className="text-sm text-ink-soft" aria-label={tp.breadcrumb}>
        <Link href={lp(locale, "/shop/")} className="hover:text-ink">{tp.catalog}</Link>
        <span className="mx-2 text-ink/30" aria-hidden="true">/</span>
        <span aria-current="page">{range?.title}</span>
      </nav>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-6 lg:mt-5 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
        <div className="grid content-start gap-3">
          <div className="relative -mx-5 aspect-video overflow-hidden bg-sand sm:mx-0 sm:rounded-[2rem]">
            <Image src={product.images[0]} alt={product.name} fill priority sizes="(min-width:1024px) 58vw, 100vw" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/50 to-transparent" aria-hidden="true" />
            {product.badge && <span className="absolute top-3 start-3 rounded-full bg-copper-deep px-3 py-1 text-xs font-bold text-white">{product.badge}</span>}
            <span className="absolute bottom-3 end-4 font-display text-5xl font-extrabold text-white drop-shadow-lg sm:text-6xl" dir="ltr" aria-hidden="true">{product.sizeLabel}</span>
          </div>
          {product.images.length > 1 && (
            <Gallery layout="strip" images={product.images.map((src, i) => ({ src, alt: tp.photo(plain(product.name), i + 1) }))} />
          )}
        </div>

        <div className="lg:self-center">
          <p className="eyebrow">{range?.subtitle}</p>
          <h1 className="mt-2 text-[2.4rem] font-extrabold leading-[1.05] sm:text-5xl">{product.name}</h1>
          <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <Stars locale={locale} value={5} className="size-3.5" /> {biz.rating} · {t.common.reviewsOnGoogle(biz.reviewCount)}
          </a>
          <div className="mt-5 flex items-end gap-3">
            <p className="font-display text-5xl font-extrabold leading-none tabular-nums">{ils(product.price)}</p>
            <p className="pb-1 text-sm leading-tight text-ink-soft">
              {tp.vat}
              <br />
              {tp.payments(site.maxPayments)}
            </p>
          </div>
          {product.todo && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200"><span aria-hidden="true">⚠️</span> {product.todo}</p>}
          <p className="mt-4 leading-7 text-ink-soft">{product.shortDescription}</p>
          {facts.length > 0 && (
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label} className="flex gap-2">
                  <dt className="font-bold">{f.label}:</dt>
                  <dd className="text-ink-soft">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

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
                {tp.chooseAddons} <Icon name="chevron" className="size-4" />
              </a>
            ) : (
              <ProductBuyBox product={product} />
            )}
            <Design3DButton locale={locale} product={product} variant="tile" />
          </div>
        </div>
      </div>

      {configurable && (
        <div className="mt-10 sm:mt-14">
          <AddonBuilder product={product} />
        </div>
      )}

      <section className="mt-12 grid gap-6 sm:mt-16 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
        <div>
          <h2 className="text-3xl font-extrabold">{tp.spec}</h2>
          <p className="mt-2 text-ink-soft">
            <Icon name="truck" className="me-1 inline size-4 align-[-2px] text-brand-dark" /> {tp.specNote} · {tp.invoiceNote} ·{" "}
            <Link href={lp(locale, "/terms/")} className="underline">
              {tp.terms}
            </Link>{" "}
            ·{" "}
            <Link href={lp(locale, "/warranty/")} className="underline">
              {tp.warranty}
            </Link>
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
          {d?.approximate && <p className="mt-2 text-xs text-ink-soft">{tp.approx}</p>}
        </div>
      </section>

      {product.category === "modubox" && <Materials locale={locale} compact />}

      {sizes.length > 1 && (
        <section className="mt-12">
          <h2 className="mb-3 text-2xl font-extrabold">{tp.moreSizes}</h2>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
            {sizes.map((p) => (
              <Link
                key={p.slug}
                href={lp(locale, `/product/${p.slug}/`)}
                aria-current={p.slug === product.slug ? "page" : undefined}
                className={`shrink-0 rounded-2xl border px-4 py-2 text-center transition ${p.slug === product.slug ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}
              >
                <span className="block font-black" dir="ltr">{p.sizeLabel}</span>
                <span className={`block text-xs ${p.slug === product.slug ? "text-white/70" : "text-ink-soft"}`}>{ils(p.price)}</span>
              </Link>
            ))}
          </div>
          {product.category === "modubox" && <CustomSizeNote locale={locale} className="mt-4 max-w-2xl" />}
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
