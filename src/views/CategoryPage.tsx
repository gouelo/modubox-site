import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CustomSizeNote } from "@/components/CustomSize";
import { Faq } from "@/components/Faq";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { dict, lp, type Locale } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { photoUrl } from "@/lib/catalog";
import { accessoryAddons, addonListPrice, categoryPath, categoryProducts, categorySlugs, getCategoryPage } from "@/lib/category-pages";
import { formatILS } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

// the slugs are partly Hebrew, so the address may arrive percent-encoded
const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export const categoryParams = () => categorySlugs.map((category) => ({ category }));

export function categoryMeta(locale: Locale, rawSlug: string): Metadata {
  const page = getCategoryPage(decode(rawSlug), locale);
  if (!page) return {};
  const first = categoryProducts(page, locale)[0]?.images[0] ?? accessoryAddons(locale).find((a) => a.image)?.image;
  return pageMeta(locale, `/${page.slug}/`, {
    title: page.title,
    description: page.description,
    ...(first ? { openGraph: { images: [{ url: photoUrl(first) }] } } : {}),
  });
}

/**
 * A landing page for one kind of shed (data/categories.json): the phrase in
 * the title and H1, a short text, the sheds (or add-ons) it is about, a few
 * questions with FAQPage JSON-LD, and breadcrumbs. Clean and modest: only the
 * footer's small links row leads here.
 */
export function CategoryPage({ locale, slug: rawSlug }: { locale: Locale; slug: string }) {
  const page = getCategoryPage(decode(rawSlug), locale);
  if (!page) notFound();
  const t = dict(locale);
  const c = t.categoryPage;
  const products = categoryProducts(page, locale);
  const addons = page.products === "addons" ? accessoryAddons(locale) : [];
  const ils = (n: number) => formatILS(n, locale);
  const faqJsonLd = page.faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }
    : null;

  return (
    <div className="container-x max-w-6xl py-6 sm:py-10">
      <Breadcrumbs
        label={t.product.breadcrumb}
        crumbs={[
          { name: t.product.home, path: lp(locale, "/") },
          { name: c.catalog, path: lp(locale, "/shop/") },
          { name: page.h1, path: categoryPath(page.slug, locale) },
        ]}
      />

      <header className="mt-5 max-w-3xl">
        <h1 className="text-3xl font-extrabold sm:text-5xl">{page.h1}</h1>
        <p className="mt-4 text-lg leading-8 text-ink-soft">{page.lead}</p>
      </header>

      <section className="mt-10" aria-labelledby="grid-title">
        <h2 id="grid-title" className="mb-5 text-2xl font-extrabold">{page.gridTitle}</h2>
        {products.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.slug} locale={locale} product={p} priority={i < 2} />
            ))}
          </div>
        )}
        {addons.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {addons.map((a) => {
              const price = addonListPrice(a);
              return (
                <li key={a.id} className="flex gap-4 rounded-3xl border border-line p-4">
                  {a.image && (
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-line">
                      <Image src={a.image} alt={a.name} fill sizes="80px" className="object-cover" />
                    </span>
                  )}
                  <div>
                    <h3 className="font-bold">{a.name}</h3>
                    <p className="mt-1 text-sm font-bold tabular-nums text-brand-dark">
                      {price === null ? c.addonOnRequest : price.kind === "fixed" ? ils(price.amount) : price.kind === "from" ? c.addonFrom(ils(price.amount)) : c.addonPerM2(ils(price.amount))}
                    </p>
                    {a.description && <p className="mt-1 text-sm leading-6 text-ink-soft">{a.description}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {page.products === "modubox" && <CustomSizeNote locale={locale} className="mt-6 max-w-2xl" />}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={lp(locale, "/shop/")} className="btn-ghost px-6 py-3">
            {page.products === "addons" ? c.chooseShed : c.allSizes} <Icon name="arrow" className="size-4" />
          </Link>
          <a href={waLink(c.askText(page.h1))} target="_blank" rel="noopener" className="btn-wa px-6 py-3">
            <Icon name="whatsapp" /> {c.ask}
          </a>
        </div>
      </section>

      {page.sections.length > 0 && (
        <div className="mt-14 grid max-w-3xl gap-10">
          {page.sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-2xl font-extrabold">{s.title}</h2>
              {s.text.map((p, i) => (
                <p key={i} className="mt-3 leading-8 text-ink-soft">{p}</p>
              ))}
            </section>
          ))}
        </div>
      )}

      {faqJsonLd && (
        <section className="mt-14 max-w-4xl" aria-labelledby="category-faq">
          <h2 id="category-faq" className="mb-5 text-2xl font-extrabold">{c.faq}</h2>
          <Faq items={page.faq} locale={locale} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        </section>
      )}
    </div>
  );
}
