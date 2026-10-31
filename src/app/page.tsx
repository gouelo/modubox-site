import Image from "next/image";
import Link from "next/link";
import { Design3DButton } from "@/components/Design3DButton";
import { BuildLauncher } from "@/components/home/BuildLauncher";
import { ClientLogos } from "@/components/home/ClientLogos";
import { Craftsmanship } from "@/components/home/Craftsmanship";
import { HomeHero } from "@/components/home/HomeHero";
import { PromoBanner } from "@/components/home/PromoBanner";
import { ReviewMarquee } from "@/components/home/ReviewMarquee";
import { Icon, type IconName } from "@/components/Icon";
import { LeadForm } from "@/components/LeadForm";
import { Materials } from "@/components/Materials";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { Stars } from "@/components/Stars";
import { VideoCard } from "@/components/VideoCard";
import { categories, lowestPrice, productsIn, reviews, site, videos } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

const FEATURED = ["modubox-3x2", "modubox-3x3", "modubox-4x2", "modubox-4x3", "modubox-5x3", "modubox-6x3"];
/** the home page's videos: Yoel explaining how to choose a shed, and the channel's most-watched build */
const VIDEOS = [
  { id: "HhLbcjyC81g", label: "איך בוחרים מחסן", hd: false },
  { id: "PfxZivCF1A4", label: "הרכבה מתחילה ועד הסוף", hd: true },
];

/** What people put in the yard: Yoel's renders (and a real storage shed); the gallery stays real photos only. */
const USES = [
  { src: "photos/0e9ce80c.webp", title: "מחסן גינה", text: "כלי גינה, אופניים וציוד, מסודרים ויבשים", alt: "מחסן גינה מודובוקס לבן בחצר" },
  { src: "renders/garden-office-black.webp", title: "קליניקה וחדר טיפולים", text: "שקט, מבודד ועם כניסה נפרדת", alt: "יחידת מודובוקס בפרופיל שחור עם קיר זכוכית וחדר עבודה בפנים" },
  { src: "renders/garden-suite-black.webp", title: "יחידת מתבגר וחלל אירוח", text: "חדר משלו לנער, או פינה לאורחים", alt: "יחידת מודובוקס רחבה בפרופיל שחור עם חלון, קיר זכוכית ושביל" },
  { src: "renders/garden-studio-black.webp", title: "ספרייה ופינת קריאה", text: "מדפים, תאורה ושקט בגינה", alt: "יחידת מודובוקס בפרופיל שחור עם דלת לבנה ומדפים מוארים" },
  { src: "renders/garden-office-white.webp", title: "משרד בגינה", text: "עבודה מהבית, בלי לעבוד מהסלון", alt: "יחידת חצר מודובוקס לבנה עם משרד בפנים" },
  { src: "renders/garden-meeting-room.webp", title: "חדר ישיבות וסטודיו", text: "קיר ויטרינה, מיזוג וחשמל", alt: "יחידת מודובוקס עם קיר ויטרינה ותריס, ובתוכה שולחן ישיבות" },
];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "ruler", title: "בוחרים מידה", text: "18 מידות, מ־1×0.80 ועד 6×3. לכל מידה מחיר קבוע ושקוף." },
  { icon: "door", title: "מוסיפים תוספות", text: "צבע פרופילים, דלתות, חלונות וויטרינה, חשמל, מזגן ורצפה. המחיר מתעדכן תוך כדי." },
  { icon: "truck", title: "מקבלים את המחסן מותקן עד הבית", text: `הצוות שלנו מביא ומרכיב אצלכם, תוך ${site.installationDays} ימי עסקים.` },
];

export default function Home() {
  const sheds = productsIn("modubox");
  const featured = FEATURED.map((s) => sheds.find((p) => p.slug === s)).filter((p) => !!p);
  const homeVideos = VIDEOS.map((v) => ({ ...v, title: videos.find((x) => x.youtubeId === v.id)?.title ?? v.label }));

  return (
    <>
      <HomeHero fromPrice={formatILS(lowestPrice("modubox"))} sizes={sheds.length} range={`מ־${sheds[0].sizeLabel} ועד ${sheds[sheds.length - 1].sizeLabel}`} />

      <PromoBanner />

      {/* CATALOG: six popular sizes, each photo whole */}
      <section className="container-x mt-16 sm:mt-24">
        <Reveal className="mb-6 flex items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="eyebrow">הקטלוג</p>
            <h2 className="h-section mt-1">המידות הפופולריות</h2>
          </div>
          <Link href="/shop/" className="group flex shrink-0 items-center gap-1 font-bold text-brand-dark">
            כל {sheds.length} המידות <Icon name="arrow" className="size-4 transition group-hover:-translate-x-1" />
          </Link>
        </Reveal>
        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {featured.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 0.08} className="w-[85%] shrink-0 snap-start sm:w-auto">
              <ProductCard product={p} priority={i < 2} sizes="(min-width:1024px) 30vw, (min-width:640px) 48vw, 85vw" />
            </Reveal>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.slice(1).map((c) => (
            <Link key={c.id} href={`/shop/#${c.id}`} className="rounded-full border border-line px-4 py-2 text-sm font-bold transition hover:border-ink hover:bg-ink hover:text-white">
              {c.title} · החל מ־{formatILS(lowestPrice(c.id))}
            </Link>
          ))}
        </div>
      </section>

      {/* USES: what people put in the yard */}
      <section className="mt-16 bg-night py-14 text-white sm:mt-28 sm:py-20">
        <div className="container-x">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="eyebrow text-glow">השראה</p>
              <h2 className="h-section mt-1">חדר נוסף בחצר, לכל מה שתרצו</h2>
              <p className="mt-3 text-lg leading-8 text-white/70">מחסן גינה, קליניקה, יחידת מתבגר, חלל אירוח, ספרייה ביתית או משרד: אותו מבנה מבודד, עם הפתחים והתוספות שמתאימים לכם.</p>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:grid-rows-[15rem_15rem_15rem]">
            {USES.map((u, i) => (
              <Reveal key={u.src} delay={(i % 3) * 0.06} className={i === 0 ? "sm:col-span-2 lg:row-span-2" : ""}>
                <figure className="group relative aspect-video overflow-hidden rounded-3xl bg-white/5 lg:aspect-auto lg:h-full">
                  <Image src={u.src} alt={u.alt} fill sizes={i === 0 ? "(min-width:1024px) 66vw, 100vw" : "(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"} className="object-cover transition duration-[1.6s] ease-(--ease-out-expo) group-hover:scale-[1.04]" />
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-night/85 to-transparent" />
                  <figcaption className="absolute inset-x-4 bottom-3">
                    <span className="block text-lg font-extrabold sm:text-xl">{u.title}</span>
                    <span className="block text-sm text-white/75">{u.text}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Materials />

      <Craftsmanship />

      {/* HOW IT WORKS: buying in three steps, then the ways in (size picker, 3D, talk to us) */}
      <section className="mt-16 sm:mt-28 sm:px-6 lg:px-8">
        <div className="grain relative mx-auto max-w-7xl overflow-hidden bg-petrol py-14 text-white sm:rounded-[2.5rem] sm:py-20">
          <div className="container-x">
            <Reveal className="max-w-2xl">
              <p className="eyebrow text-glow">
                <Icon name="sparkle" className="size-4 text-copper" /> איך זה עובד
              </p>
              <h2 className="h-section mt-2">מחסן שמותאם בדיוק לכם</h2>
              <p className="mt-3 text-lg leading-8 text-white/70">שלושה צעדים פשוטים, מהמסך ועד החצר.</p>
            </Reveal>
            <ol className="relative mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
              <span className="absolute inset-x-[16%] top-7 hidden h-px bg-gradient-to-l from-white/0 via-white/25 to-white/0 sm:block" aria-hidden="true" />
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.1}>
                  <li className="relative flex h-full gap-4 sm:flex-col sm:items-center sm:text-center">
                    <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-petrol shadow-lift">
                      <Icon name={s.icon} className="size-6" />
                      <span className="absolute -top-2 -start-2 grid size-6 place-items-center rounded-full bg-copper text-xs font-black text-white">{i + 1}</span>
                    </span>
                    <span>
                      <span className="block text-xl font-extrabold">{s.title}</span>
                      <span className="mt-1 block leading-7 text-white/70">{s.text}</span>
                    </span>
                  </li>
                </Reveal>
              ))}
            </ol>
            <BuildLauncher sizes={sheds.map((p) => ({ slug: p.slug, sizeLabel: p.sizeLabel, widthM: p.widthM, depthM: p.depthM, areaM2: p.areaM2, price: p.price, popular: FEATURED.includes(p.slug) }))}>
              <Design3DButton variant="tile" className="border-white/15 bg-white/5 text-white hover:border-glow" />
              <a href="#contact" className="btn-glass px-7 py-4 text-base">
                <Icon name="phone" className="size-5" /> דברו איתנו
              </a>
            </BuildLauncher>
          </div>
        </div>
      </section>

      {/* VIDEO: Yoel explains, then a whole build */}
      <section className="container-x mt-16 sm:mt-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow">וידאו</p>
            <h2 className="h-section mt-1">ככה מרכיבים מחסן מודובוקס</h2>
            <p className="mt-3 text-lg leading-8 text-ink-soft">המבנה מגיע מהמפעל מוכן, והצוות שלנו מרכיב אותו אצלכם בחצר. שמעו מאיתנו איך בוחרים מחסן, וצפו בהרכבה מתחילתה ועד הסוף.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/gallery/" className="btn-ghost">
              עוד סרטונים ותמונות <Icon name="arrow" className="size-4" />
            </Link>
            <a href={site.social.youtube} target="_blank" rel="noopener" className="btn-ghost">
              <Icon name="youtube" className="size-5 text-red-600" /> הערוץ שלנו
            </a>
          </div>
        </Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {homeVideos.map((v, i) => (
            <Reveal key={v.id} delay={i * 0.1}>
              <p className="mb-2 text-sm font-bold text-brand-dark">{v.label}</p>
              <VideoCard id={v.id} title={v.title} large hd={v.hd} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="mt-16 sm:mt-28">
        <Reveal className="container-x mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 sm:mb-10">
          <div>
            <p className="eyebrow">לקוחות</p>
            <h2 className="h-section mt-1">מה אומרים עלינו</h2>
          </div>
          <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="flex shrink-0 items-center gap-2 text-sm font-bold">
            <Stars value={5} className="size-4" /> {site.rating} · {site.reviewCount} ביקורות בגוגל <Icon name="arrow" className="size-4" />
          </a>
        </Reveal>
        <ReviewMarquee reviews={reviews} />
      </section>

      <ClientLogos />

      {/* CONTACT: the lead form (WhatsApp until there's an endpoint) */}
      <section id="contact" className="container-x mt-16 scroll-mt-20 sm:mt-28">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-ink text-white sm:rounded-[2.5rem]">
          <Image src="renders/garden-office-black.webp" alt="" fill sizes="100vw" className="-z-10 object-cover opacity-35" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-l from-ink via-ink/85 to-ink/40" />
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14 lg:p-14">
            <Reveal>
              <p className="eyebrow text-glow">דברו איתנו</p>
              <h2 className="h-section mt-1">לא בטוחים איזו מידה?</h2>
              <p className="mt-3 text-lg leading-8 text-white/75">השאירו פרטים ונחזור אליכם, או כתבו לנו בוואטסאפ. נעזור לבחור מידה ותוספות, בלי התחייבות.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a href={waLink(site.whatsappGreeting)} target="_blank" rel="noopener" className="btn-wa px-7 py-4 text-base">
                  <Icon name="whatsapp" /> וואטסאפ
                </a>
                <a href={`tel:${site.phone}`} className="btn-glass px-7 py-4 text-base" dir="ltr">
                  <Icon name="phone" className="size-5" /> {site.phone}
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-3xl bg-white p-5 text-ink shadow-lift sm:p-7">
                <p className="mb-4 text-xl font-extrabold">השאירו פרטים ונחזור אליכם</p>
                <LeadForm />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
