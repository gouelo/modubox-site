import Image from "next/image";
import Link from "next/link";
import { Design3DButton } from "@/components/Design3DButton";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { ReviewCard } from "@/components/ReviewCard";
import { Stars } from "@/components/Stars";
import { categories, lowestPrice, productsIn, reviews, site } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

const FEATURED = ["modubox-2x1", "modubox-2x2", "modubox-3x2", "modubox-4x2"];

export default function Home() {
  const sheds = productsIn("modubox");
  const featured = FEATURED.map((s) => sheds.find((p) => p.slug === s)).filter((p) => !!p);

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <Image src="photos/2c981b23.webp" alt="יחידת חצר של מודובוקס עם קיר ויטרינה בשקיעה" fill priority sizes="100vw" className="-z-10 object-cover opacity-80" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10 lg:bg-gradient-to-l" />
        <div className="container-x flex min-h-[68svh] flex-col justify-end pb-10 pt-20 lg:min-h-[72vh] lg:justify-center">
          <div className="max-w-xl">
            <h1 className="text-[2.6rem] font-black leading-[1.05] tracking-tight sm:text-6xl">
              החצר שלכם.
              <br />
              <span className="text-brand">עוד חדר.</span>
            </h1>
            <p className="mt-4 text-lg leading-8 text-white/85">
              מחסנים ויחידות חצר מפנל מבודד ושלדת אלומיניום. {site.warrantyYears} שנות אחריות, החל מ־{formatILS(lowestPrice("modubox"))}.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/shop/" className="btn bg-white px-7 py-4 text-base text-ink hover:bg-sand">
                לקטלוג המחסנים <Icon name="arrow" className="size-4" />
              </Link>
              <a href={waLink(site.whatsappGreeting)} target="_blank" rel="noopener" className="btn-wa px-7 py-4 text-base">
                <Icon name="whatsapp" /> ייעוץ בוואטסאפ
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CATALOG */}
      <section className="container-x mt-16 sm:mt-24">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-black tracking-tight sm:text-4xl">המידות הפופולריות</h2>
          <Link href="/shop/" className="shrink-0 font-bold text-brand-dark">כל {sheds.length} המידות ←</Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {featured.map((p, i) => (
            <div key={p.slug} className="w-[78%] shrink-0 snap-start sm:w-auto">
              <ProductCard product={p} priority={i < 2} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.slice(1).map((c) => (
            <Link key={c.id} href={`/shop/#${c.id}`} className="rounded-full border border-line px-4 py-2 text-sm font-bold hover:border-ink">
              {c.title} · החל מ־{formatILS(lowestPrice(c.id))}
            </Link>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-md">
          <Design3DButton />
        </div>
      </section>

      {/* REVIEWS */}
      <section className="container-x mt-16 sm:mt-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 className="text-2xl font-black tracking-tight sm:text-4xl">מה אומרים עלינו</h2>
          <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="flex shrink-0 items-center gap-2 text-sm font-bold">
            <Stars value={5} className="size-4" /> {site.rating} · {site.reviewCount} בגוגל
          </a>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.slice(0, 3).map((r) => (
            <ReviewCard key={r.name} {...r} />
          ))}
        </div>
      </section>

      {/* WHATSAPP CTA */}
      <section className="container-x mt-16 sm:mt-24">
        <div className="rounded-[2rem] bg-sand px-6 py-10 text-center sm:py-14">
          <h2 className="text-2xl font-black tracking-tight sm:text-4xl">לא בטוחים איזו מידה?</h2>
          <p className="mt-2 text-ink-soft">כתבו לנו – נעזור לבחור תוך דקות.</p>
          <a href={waLink(site.whatsappGreeting)} target="_blank" rel="noopener" className="btn-wa mt-6 px-8 py-4 text-base">
            <Icon name="whatsapp" /> דברו איתנו בוואטסאפ
          </a>
        </div>
      </section>
    </>
  );
}
