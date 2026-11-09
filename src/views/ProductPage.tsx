import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CustomSizeNote } from "@/components/CustomSize";
import { Design3DButton } from "@/components/Design3DButton";
import { Gallery } from "@/components/Gallery";
import { Icon } from "@/components/Icon";
import { Materials } from "@/components/Materials";
import { PriceIncludes } from "@/components/PriceIncludes";
import { ProductBuyBox } from "@/components/ProductBuyBox";
import { Stars } from "@/components/Stars";
import { AddonBuilder } from "@/components/builder/AddonBuilder";
import { dict, lp, type Locale } from "@/i18n";
import { fitDescription, pageMeta } from "@/i18n/meta";
import { addonsFor, catalog, getProduct, photoUrl, plain, products, productsIn } from "@/lib/catalog";
import { formatCm, formatILS } from "@/lib/format";
import type { Product } from "@/lib/types";
import { fulfillmentOptions } from "@/lib/pricing";
import { everestModels } from "@/lib/category-pages";
import { BUSINESS_ID, business } from "@/lib/seo/settings";
import { loadSeo } from "@/lib/seo/store";

export function productParams() {
  return products.map((p) => ({ slug: p.slug }));
}

/** A model the old site sold as "מחסן מודובוקס אוורסט": its name with "אוורסט" for search titles (data/categories.json everestModels). */
export function searchName(p: Product, locale: Locale): string {
  const name = plain(p.name);
  return everestModels.has(p.slug) ? dict(locale).meta.product.everest(name) : name;
}

export function productMeta(locale: Locale, slug: string): Metadata {
  const p = getProduct(slug, locale);
  if (!p) return {};
  const m = dict(locale).meta.product;
  const name = searchName(p, locale);
  const base = m.description(name, p.shortDescription, p.warrantyYears);
  const more = m.more(catalog(locale).site.maxPayments);
  return pageMeta(locale, `/product/${slug}/`, {
    title: m.title(name, formatILS(p.price, locale)),
    description: fitDescription([base, `${base} ${more}`, `${name}: ${p.shortDescription}`, `${name}: ${p.shortDescription} ${more}`]),
    openGraph: { images: [{ url: photoUrl(p.images[0]) }] },
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
  const cm2 = (w: number, h: number) => t.format.cm(`${w}×${h}`);
  // dimensions only the factory can confirm stay off the page (the admin lists them as missing)
  const d = product.dimensions?.approximate ? null : product.dimensions;
  const delivery = fulfillmentOptions(product)[0];
  const sizes = productsIn(product.category, locale);
  const everest = everestModels.has(product.slug);
  const jsonLd = productJsonLd(product, locale, delivery.price, site.installationDays, everest ? searchName(product, locale) : null, facts);
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
    ...(d?.slidingWindow ? ([[r.window, cm2(d.slidingWindow.width, d.slidingWindow.height)]] as [string, string][]) : []),
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
      <Breadcrumbs
        label={tp.breadcrumb}
        crumbs={[
          { name: tp.home, path: lp(locale, "/") },
          { name: tp.catalog, path: lp(locale, "/shop/") },
          { name: plain(product.name), path: lp(locale, `/product/${product.slug}/`) },
        ]}
      />

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-6 lg:mt-5 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
        <div className="grid content-start gap-3">
          <div className="relative -mx-5 aspect-video overflow-hidden bg-sand sm:mx-0 sm:rounded-[2rem]">
            <Image src={product.images[0]} alt={plain(product.name)} fill priority sizes="(min-width:1024px) 58vw, 100vw" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/50 to-transparent" aria-hidden="true" />
            {product.badge && <span className="absolute top-3 start-3 rounded-full bg-copper-deep px-3 py-1 text-xs font-bold text-white">{product.badge}</span>}
            <span className="absolute bottom-3 end-4 font-display text-5xl font-extrabold text-white drop-shadow-lg sm:text-6xl" dir="ltr" aria-hidden="true">{product.sizeLabel}</span>
          </div>
          {product.images.length > 1 && (
            <Gallery layout="strip" images={product.images.map((src, i) => ({ src, alt: tp.photo(plain(product.name), i + 1) }))} />
          )}
          <p className="text-xs text-ink-soft">{tp.illustration}</p>
        </div>

        <div className="lg:self-center">
          <p className="eyebrow">{range?.subtitle}</p>
          <h1 className="mt-2 text-[2.4rem] font-extrabold leading-[1.05] sm:text-5xl">{product.name}</h1>
          {everest && <p className="mt-1 text-sm text-ink-soft">{tp.everestAka(t.meta.product.everestAka(product.sizeLabel))}</p>}
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

      {/* under the configurator (Yoel, round 17): first build it, then what the base price covers */}
      {product.category === "modubox" && <PriceIncludes />}

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
        </div>
      </section>

      {product.details && product.details.length > 0 && (
        <section className="mt-12 max-w-3xl sm:mt-16" aria-labelledby="product-details">
          <h2 id="product-details" className="text-3xl font-extrabold">{tp.details}</h2>
          {product.details.map((d) => (
            <div key={d.title} className="mt-5">
              <h3 className="text-lg font-bold">{d.title}</h3>
              <p className="mt-1 leading-8 text-ink-soft">{d.text}</p>
            </div>
          ))}
        </section>
      )}

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

/**
 * The product as search engines read it (Google's product snippets and merchant listings).
 * No aggregateRating: the Google reviews are the business's, not this product's (the agency's report).
 * Everything else from the data: the delivery price and the 21 business days of the terms,
 * and the return policy of the terms, which follows the Consumer Protection Law (14 days for a
 * sale at a distance, a cancellation fee of 100 ₪ or 5%, whichever is lower: 100 ₪ on every shed here).
 */
export function productJsonLd(product: Product, locale: Locale, deliveryPrice: number | null, days: number, alternateName: string | null, facts: { label: string; value: string }[] = []) {
  const { site } = catalog(locale);
  const restocking = Math.min(100, Math.round(product.price * 0.05));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: plain(product.name),
    ...(alternateName ? { alternateName } : {}),
    description: product.shortDescription,
    sku: product.slug,
    brand: { "@type": "Brand", name: product.category === "gilboa" ? "Gilboa" : "Modubox" },
    image: product.images.map((i) => (/^https?:/.test(i) ? i : `${site.url}${photoUrl(i)}`)),
    offers: {
      "@type": "Offer",
      priceCurrency: "ILS",
      price: product.price,
      // the price list has no end date: a year ahead, renewed with every build
      priceValidUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      url: `${site.url}${encodeURI(lp(locale, `/product/${product.slug}/`))}`,
      seller: { "@id": BUSINESS_ID },
      ...(deliveryPrice !== null
        ? {
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingRate: { "@type": "MonetaryAmount", value: deliveryPrice, currency: "ILS" },
              shippingDestination: { "@type": "DefinedRegion", addressCountry: "IL" },
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: days, unitCode: "DAY" },
                transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
              },
            },
          }
        : {}),
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IL",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnInStore",
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
        restockingFee: { "@type": "MonetaryAmount", value: restocking, currency: "ILS" },
      },
    },
    ...(facts.length ? { additionalProperty: facts.map((f) => ({ "@type": "PropertyValue", name: f.label, value: f.value })) } : {}),
  };
}
