import type { Metadata } from "next";
import { Design3DButton } from "@/components/Design3DButton";
import { ProductCard } from "@/components/ProductCard";
import { categories, productsIn } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "קטלוג מחסנים – כל המידות והמחירים",
  description: "כל מחסני מודובוקס מפנל מבודד במידות 1×0.80 עד 6×3, מחסני גלבוע, מבני שירותים ועמדות שמירה – עם מחירים, הובלה והתקנה.",
};

export default function ShopPage() {
  return (
    <div className="container-x py-8 sm:py-12">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">כל המחסנים והמבנים</h1>
        <p className="mt-2 text-ink-soft">המחירים כוללים מע&quot;מ. הובלה והתקנה נבחרות בסל.</p>
      </header>
      <nav className="no-scrollbar sticky top-16 z-20 -mx-4 mt-4 flex gap-2 overflow-x-auto bg-white/90 px-4 py-3 backdrop-blur lg:top-[72px]" aria-label="קטגוריות">
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
              <h2 className="text-2xl font-black sm:text-3xl">{c.title}</h2>
              <p className="text-ink-soft">{c.subtitle}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {productsIn(c.id).map((p, i) => (
              <ProductCard key={p.slug} product={p} priority={c.id === "modubox" && i < 2} />
            ))}
          </div>
        </section>
      ))}
      <div className="mx-auto mt-12 max-w-md">
        <Design3DButton />
      </div>
    </div>
  );
}
