import Image from "next/image";
import Link from "next/link";
import { Design3DButton } from "@/components/Design3DButton";
import { HeroTitle } from "@/components/HeroTitle";
import { Icon, type IconName } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { ReviewCard } from "@/components/ReviewCard";
import { Stars } from "@/components/Stars";
import { addons, categories, lowestPrice, productsIn, reviews, site } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

const FEATURED = ["modubox-2x1", "modubox-2x2", "modubox-3x2", "modubox-4x2"];
/** where "start building" leads: the best-selling size's builder */
const BUILD_FROM = "modubox-3x2";
const SHOWCASE = ["double-door", "sliding-window", "glass-wall", "electric-panel", "vent-grill", "shelf-5"];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "ruler", title: "בוחרים מידה", text: "18 מידות, מ־1×0.80 ועד 6×3" },
  { icon: "door", title: "מוסיפים תוספות", text: "דלתות, חלונות, ויטרינה, חשמל ומזגן" },
  { icon: "truck", title: "מקבלים מותקן", text: `עד ${site.installationDays} ימי עסקים, עד הבית` },
];

export default function Home() {
  const sheds = productsIn("modubox");
  const featured = FEATURED.map((s) => sheds.find((p) => p.slug === s)).filter((p) => !!p);
  const showcase = SHOWCASE.map((id) => addons.find((a) => a.id === id)).filter((a) => !!a);

  return (
    <>
      {/* HERO */}
      <section className="relative isolate -mt-16 overflow-hidden bg-night text-white lg:-mt-[72px]">
        {/* phones: the photo fills the top and fades into the dark; desktop: full bleed */}
        <div className="absolute inset-x-0 top-0 -z-10 h-[64%] overflow-hidden lg:h-full">
          <Image
            src="photos/2c981b23.webp"
            alt="יחידת חצר של מודובוקס עם קיר ויטרינה בשקיעה"
            fill
            priority
            sizes="100vw"
            className="animate-[heroZoom_2.4s_cubic-bezier(0.16,1,0.3,1)_both] object-cover object-[30%_center] lg:object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/20 to-night/30 lg:bg-gradient-to-l lg:from-night/90 lg:via-night/40 lg:to-transparent" />
        </div>
        <div className="container-x flex min-h-[92svh] flex-col justify-end pb-8 pt-28 lg:min-h-[88vh] lg:justify-center lg:pb-16">
          <div className="max-w-2xl">
            <p className="eyebrow text-glow">
              <span className="h-px w-8 bg-glow/70" /> מבנים מפנל מבודד · ייצור ישראלי
            </p>
            <div className="mt-4">
              <HeroTitle lines={["החצר שלכם."]} accent="עוד חדר." />
            </div>
            <Reveal delay={0.5}>
              <p className="mt-5 max-w-md text-lg leading-8 text-white/80">
                מחסנים ויחידות חצר בשלדת אלומיניום, מותאמים לכם עם דלתות, חלונות, חשמל ומיזוג. החל מ־{formatILS(lowestPrice("modubox"))}.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop/" className="btn bg-white px-7 py-4 text-base text-ink hover:bg-brand-tint">
                  לקטלוג המחסנים <Icon name="arrow" className="size-4" />
                </Link>
                <a href={waLink(site.whatsappGreeting)} target="_blank" rel="noopener" className="btn-glass px-7 py-4 text-base">
                  <Icon name="whatsapp" className="size-5 text-wa" /> ייעוץ בוואטסאפ
                </a>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.7} className="mt-10 lg:mt-16">
            <dl className="grid grid-cols-3 divide-x divide-x-reverse divide-white/15 rounded-2xl border border-white/15 bg-white/5 py-3 backdrop-blur-md sm:max-w-xl">
              {[
                [`${site.rating}`, `${site.reviewCount} ביקורות בגוגל`],
                [`${site.warrantyYears}`, "שנות אחריות"],
                [`${site.installationDays}`, "ימים להתקנה"],
              ].map(([v, k]) => (
                <div key={k} className="px-3 text-center">
                  <dt className="sr-only">{k}</dt>
                  <dd className="font-display text-2xl font-extrabold sm:text-3xl">{v}</dd>
                  <dd className="text-xs text-white/65">{k}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* CATALOG */}
      <section className="container-x mt-16 sm:mt-28">
        <Reveal className="mb-6 flex items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="eyebrow">הקטלוג</p>
            <h2 className="h-section mt-1">המידות הפופולריות</h2>
          </div>
          <Link href="/shop/" className="group flex shrink-0 items-center gap-1 font-bold text-brand-dark">
            כל {sheds.length} המידות <Icon name="arrow" className="size-4 transition group-hover:-translate-x-1" />
          </Link>
        </Reveal>
        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {featured.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.08} className="w-[72%] shrink-0 snap-start sm:w-auto">
              <ProductCard product={p} priority={i < 2} />
            </Reveal>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.slice(1).map((c) => (
            <Link key={c.id} href={`/shop/#${c.id}`} className="rounded-full border border-line px-4 py-2 text-sm font-bold transition hover:border-ink hover:bg-ink hover:text-white">
              {c.title} · החל מ־{formatILS(lowestPrice(c.id))}
            </Link>
          ))}
        </div>
      </section>

      {/* ADD-ONS: how a shed becomes yours */}
      <section className="mt-16 sm:mt-28 sm:px-6 lg:px-8">
        <div className="grain relative mx-auto max-w-7xl overflow-hidden bg-petrol py-14 text-white sm:rounded-[2.5rem] sm:py-20">
          <div className="container-x">
            <Reveal className="max-w-2xl">
              <p className="eyebrow text-glow">
                <Icon name="sparkle" className="size-4 text-copper" /> תוספות
              </p>
              <h2 className="h-section mt-2">מחסן שמותאם בדיוק לכם</h2>
              <p className="mt-3 text-lg leading-8 text-white/70">בכל דף מחסן בוחרים תוספות בכמה צעדים, ורואים את המחיר הסופי מתעדכן תוך כדי.</p>
            </Reveal>
            <ol className="mt-10 grid gap-3 sm:grid-cols-3 sm:gap-5">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.1}>
                  <li className="flex h-full items-center gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 sm:flex-col sm:items-start sm:p-6">
                    <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-petrol">
                      <Icon name={s.icon} className="size-5" />
                      <span className="absolute -top-2 -start-2 grid size-6 place-items-center rounded-full bg-copper text-xs font-black text-white">{i + 1}</span>
                    </span>
                    <span>
                      <span className="block text-lg font-bold">{s.title}</span>
                      <span className="block text-sm text-white/65">{s.text}</span>
                    </span>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
          <div className="no-scrollbar mt-10 flex snap-x gap-3 overflow-x-auto px-5 sm:px-6 lg:px-8">
            {showcase.map((a) => (
              <Link
                key={a.id}
                href={`/product/${BUILD_FROM}/#build`}
                className="group relative h-52 w-40 shrink-0 snap-start overflow-hidden rounded-2xl bg-white/10 sm:h-64 sm:w-52"
              >
                {a.image && <Image src={a.image} alt={a.name} fill sizes="208px" className="object-cover transition duration-1000 group-hover:scale-110" />}
                <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-sm font-bold leading-snug">{a.name}</p>
                  <p className="text-xs text-glow">{a.price ? `+${formatILS(a.price)}` : "מחיר בתיאום"}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="container-x mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={`/product/${BUILD_FROM}/#build`} className="btn bg-white px-7 py-4 text-base text-ink hover:bg-brand-tint">
              התחילו להרכיב מחסן <Icon name="arrow" className="size-4" />
            </Link>
            <div className="sm:w-auto">
              <Design3DButton variant="tile" className="border-white/15 bg-white/5 text-white hover:border-glow" />
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="container-x mt-16 sm:mt-28">
        <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 sm:mb-10">
          <div>
            <p className="eyebrow">לקוחות</p>
            <h2 className="h-section mt-1">מה אומרים עלינו</h2>
          </div>
          <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="flex shrink-0 items-center gap-2 text-sm font-bold">
            <Stars value={5} className="size-4" /> {site.rating} · {site.reviewCount} בגוגל
          </a>
        </Reveal>
        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-3 md:px-0">
          {reviews.slice(0, 3).map((r, i) => (
            <Reveal key={r.name} delay={i * 0.08} className="w-[85%] shrink-0 snap-start md:w-auto">
              <ReviewCard {...r} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* WHATSAPP CTA */}
      <section className="container-x mt-16 sm:mt-28">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-center text-white sm:py-20">
            <Image src="photos/8b4fe247.webp" alt="" fill sizes="100vw" className="-z-10 object-cover opacity-30" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/40" />
            <h2 className="h-section">לא בטוחים איזו מידה?</h2>
            <p className="mt-3 text-white/75">כתבו לנו – נעזור לבחור תוך דקות.</p>
            <a href={waLink(site.whatsappGreeting)} target="_blank" rel="noopener" className="btn-wa mt-7 px-8 py-4 text-base">
              <Icon name="whatsapp" /> דברו איתנו בוואטסאפ
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
