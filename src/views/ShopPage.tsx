import type { Metadata } from "next";
import { Design3DButton } from "@/components/Design3DButton";
import { CustomSizeBanner } from "@/components/CustomSize";
import { ProductCard } from "@/components/ProductCard";
import { dict, type Locale } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { catalog, productsIn } from "@/lib/catalog";

export const shopMeta = (locale: Locale): Metadata => pageMeta(locale, "/shop/", dict(locale).meta.shop);

export function ShopPage({ locale }: { locale: Locale }) {
  const { categories } = catalog(locale);
  const t = dict(locale).shop;
  return (
    <div className="container-x py-8 sm:py-12">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-extrabold sm:text-5xl">{t.title}</h1>
        <p className="mt-2 text-ink-soft">{t.text}</p>
      </header>
      <nav className="no-scrollbar sticky top-16 z-20 -mx-4 mt-4 flex gap-2 overflow-x-auto bg-white/90 px-4 py-3 backdrop-blur lg:top-[72px]" aria-label={t.categories}>
        {categories.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-bold hover:border-ink">
            {c.title}
          </a>
        ))}
      </nav>
      {categories.map((c) => (
        <section key={c.id} id={c.id} className="scroll-mt-36 pt-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">{c.title}</h2>
              <p className="text-ink-soft">{c.subtitle}</p>
              {c.intro && <p className="mt-3 max-w-3xl leading-7 text-ink-soft">{c.intro}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {productsIn(c.id, locale).map((p, i) => (
              <ProductCard key={p.slug} locale={locale} product={p} priority={c.id === "modubox" && i < 2} />
            ))}
          </div>
          {c.id === "modubox" && <CustomSizeBanner locale={locale} fixedSizes={productsIn("modubox").length} className="mt-8" />}
        </section>
      ))}
      <div className="mx-auto mt-12 max-w-md">
        <Design3DButton locale={locale} />
      </div>
    </div>
  );
}
