import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { TrustBar } from "@/components/TrustBar";
import { addons, categories, productsIn } from "@/lib/catalog";
import { formatILS } from "@/lib/format";

export const metadata: Metadata = {
  title: "קטלוג מחסנים – כל המידות והמחירים",
  description: "כל מחסני מודובוקס מפנל מבודד במידות 1×0.80 עד 6×3, מחסני גלבוע, מבני שירותים ועמדות שמירה – עם מחירים, הובלה והתקנה.",
};

export default function ShopPage() {
  const extras = addons.filter((a) => a.image);
  return (
    <div className="container-x py-12">
      <header className="max-w-3xl">
        <p className="eyebrow">קטלוג</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">כל המחסנים והמבנים</h1>
        <p className="mt-4 text-lg leading-8 text-ink-soft">כל המחירים כוללים מע"מ. הובלה והתקנה נבחרות בסל לכל מוצר בנפרד.</p>
      </header>
      <nav className="no-scrollbar sticky top-16 z-20 -mx-4 mt-8 flex gap-2 overflow-x-auto bg-white/90 px-4 py-3 backdrop-blur lg:top-[72px]" aria-label="קטגוריות">
        {[...categories.map((c) => ({ id: c.id, title: c.title })), { id: "addons", title: "תוספות למחסן" }].map((c) => (
          <a key={c.id} href={`#${c.id}`} className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-bold hover:border-ink">
            {c.title}
          </a>
        ))}
      </nav>
      {categories.map((c) => (
        <section key={c.id} id={c.id} className="scroll-mt-36 pt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">{c.title}</h2>
              <p className="text-ink-soft">{c.subtitle}</p>
            </div>
            {c.id === "modubox" && (
              <Link href="/configurator/" className="btn-brand"><Icon name="cube" /> עצבו בתלת־ממד</Link>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productsIn(c.id).map((p, i) => (
              <ProductCard key={p.slug} product={p} priority={c.id === "modubox" && i < 2} />
            ))}
          </div>
        </section>
      ))}
      <section id="addons" className="scroll-mt-36 pt-14">
        <h2 className="text-2xl font-black sm:text-3xl">תוספות למחסן</h2>
        <p className="mb-6 text-ink-soft">נבחרות בעמוד של כל מחסן, ומופיעות בהדמיה התלת־ממדית. ניתנות לרכישה יחד עם מחסן מודובוקס.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {extras.map((a) => {
            const price = a.kind === "choice" ? Math.min(...a.choices!.filter((c) => c.price).map((c) => c.price!)) : a.price;
            return (
              <div key={a.id} className="card overflow-hidden">
                <div className="relative aspect-[4/3] bg-sand">
                  <Image src={a.image!} alt={a.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="font-extrabold">{a.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{a.description}</p>
                  <p className="mt-2 font-black">{price ? `${a.kind === "choice" ? "החל מ־" : ""}${formatILS(price)}` : "מחיר בתיאום"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="mt-16"><TrustBar /></div>
    </div>
  );
}
