import Image from "next/image";
import Link from "next/link";
import { Design3DButton } from "@/components/Design3DButton";
import { BuildLauncher } from "@/components/home/BuildLauncher";
import { CustomSizeBanner } from "@/components/CustomSize";
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
import { dict, lp, type Locale } from "@/i18n";
import { catalog, lowestPrice } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

const FEATURED = ["modubox-3x2", "modubox-3x3", "modubox-4x2", "modubox-4x3", "modubox-5x3", "modubox-6x3"];
/** the home page's videos: the Channel 13 piece on adding a room without renovating (round 8), and the channel's most-watched build */
const VIDEOS = [
  { id: "YKFs20v9HA4", hd: true },
  { id: "PfxZivCF1A4", hd: true },
];

/** What people put in the yard: Yoel's renders (and a real storage shed); the gallery stays real photos only. Their words: dictionary home.uses. */
const USES = ["photos/0e9ce80c.webp", "renders/garden-office-black.webp", "renders/garden-suite-black.webp", "renders/garden-studio-black.webp", "renders/garden-office-white.webp", "renders/garden-meeting-room.webp"];

const STEP_ICONS: IconName[] = ["ruler", "door", "truck"];

export function HomePage({ locale }: { locale: Locale }) {
  const { site, categories, reviews, videos, products } = catalog(locale);
  const t = dict(locale);
  const h = t.home;
  const ils = (n: number) => formatILS(n, locale);
  const vals = { factory: site.factory, days: site.installationDays, years: site.warrantyYears, payments: site.maxPayments };
  const sheds = products.filter((p) => p.category === "modubox");
  const featured = FEATURED.map((s) => sheds.find((p) => p.slug === s)).filter((p) => !!p);
  const homeVideos = VIDEOS.map((v, i) => ({ ...v, label: h.videos[i], title: videos.find((x) => x.youtubeId === v.id)?.title ?? h.videos[i] }));

  return (
    <>
      <HomeHero fromPrice={ils(lowestPrice("modubox"))} sizes={sheds.length} range={h.range(sheds[0].sizeLabel, sheds[sheds.length - 1].sizeLabel)} />

      <PromoBanner />

      {/* CATALOG: six popular sizes, each photo whole */}
      <section className="container-x mt-16 sm:mt-24">
        <Reveal className="mb-6 flex items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="eyebrow">{h.catalog.eyebrow}</p>
            <h2 className="h-section mt-1">{h.catalog.title}</h2>
          </div>
          <Link href={lp(locale, "/shop/")} className="group flex shrink-0 items-center gap-1 font-bold text-brand-dark">
            {h.catalog.all(sheds.length)} <Icon name="arrow" className="size-4 transition group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
          </Link>
        </Reveal>
        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {featured.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 0.08} className="w-[85%] shrink-0 snap-start sm:w-auto">
              <ProductCard locale={locale} product={p} priority={i < 2} sizes="(min-width:1024px) 30vw, (min-width:640px) 48vw, 85vw" />
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 sm:mt-14">
          <CustomSizeBanner locale={locale} fixedSizes={sheds.length} />
        </Reveal>
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.slice(1).map((c) => (
            <Link key={c.id} href={lp(locale, `/shop/#${c.id}`)} className="rounded-full border border-line px-4 py-2 text-sm font-bold transition hover:border-ink hover:bg-ink hover:text-white">
              {h.catalog.from(c.title, ils(lowestPrice(c.id)))}
            </Link>
          ))}
        </div>
      </section>

      {/* USES: what people put in the yard */}
      <section className="mt-16 bg-night py-14 text-white sm:mt-28 sm:py-20">
        <div className="container-x">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="eyebrow text-glow">{h.usesSection.eyebrow}</p>
              <h2 className="h-section mt-1">{h.usesSection.title}</h2>
              <p className="mt-3 text-lg leading-8 text-white/70">{h.usesSection.text}</p>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:grid-rows-[15rem_15rem_15rem]">
            {USES.map((src, i) => ({ src, ...h.uses[i] })).map((u, i) => (
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

      <Materials locale={locale} />

      <Craftsmanship locale={locale} />

      {/* HOW IT WORKS: buying in three steps, then the ways in (size picker, 3D, talk to us) */}
      <section className="mt-16 sm:mt-28 sm:px-6 lg:px-8">
        <div className="grain relative mx-auto max-w-7xl overflow-hidden bg-petrol py-14 text-white sm:rounded-[2.5rem] sm:py-20">
          <div className="container-x">
            <Reveal className="max-w-2xl">
              <p className="eyebrow text-glow">
                <Icon name="sparkle" className="size-4 text-copper" /> {h.how.eyebrow}
              </p>
              <h2 className="h-section mt-2">{h.how.title}</h2>
              <p className="mt-3 text-lg leading-8 text-white/70">{h.how.text}</p>
            </Reveal>
            <ol className="relative mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
              <span className="absolute inset-x-[16%] top-7 hidden h-px bg-gradient-to-l from-white/0 via-white/25 to-white/0 sm:block" aria-hidden="true" />
              {h.steps.map((s, i) => ({ icon: STEP_ICONS[i], title: s.title, text: s.text(vals) })).map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 0.1} className="relative flex h-full gap-4 sm:flex-col sm:items-center sm:text-center">
                  <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-petrol shadow-lift">
                    <Icon name={s.icon} className="size-6" />
                    <span className="absolute -top-2 -start-2 grid size-6 place-items-center rounded-full bg-copper-deep text-xs font-black text-white">{i + 1}</span>
                  </span>
                  <span>
                    <span className="block text-xl font-extrabold">{s.title}</span>
                    <span className="mt-1 block leading-7 text-white/70">{s.text}</span>
                  </span>
                </Reveal>
              ))}
            </ol>
            <BuildLauncher sizes={sheds.map((p) => ({ slug: p.slug, sizeLabel: p.sizeLabel, widthM: p.widthM, depthM: p.depthM, areaM2: p.areaM2, price: p.price, popular: FEATURED.includes(p.slug) }))}>
              <Design3DButton locale={locale} variant="tile" className="border-white/15 bg-white/5 text-white hover:border-glow" />
              <a href="#contact" className="btn-glass px-7 py-4 text-base">
                <Icon name="phone" className="size-5" /> {h.how.talk}
              </a>
            </BuildLauncher>
          </div>
        </div>
      </section>

      {/* VIDEO: the Channel 13 piece, then a whole build */}
      <section className="container-x mt-16 sm:mt-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow">{h.video.eyebrow}</p>
            <h2 className="h-section mt-1">{h.video.title}</h2>
            <p className="mt-3 text-lg leading-8 text-ink-soft">{h.video.text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={lp(locale, "/gallery/")} className="btn-ghost">
              {h.video.more} <Icon name="arrow" className="size-4" />
            </Link>
            <a href={site.social.youtube} target="_blank" rel="noopener" className="btn-ghost">
              <Icon name="youtube" className="size-5 text-red-600" /> {h.video.channel}
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
            <p className="eyebrow">{h.reviews.eyebrow}</p>
            <h2 className="h-section mt-1">{h.reviews.title}</h2>
            {h.reviews.note && <p className="mt-1 text-sm text-ink-soft">{h.reviews.note}</p>}
          </div>
          <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="flex shrink-0 items-center gap-2 text-sm font-bold">
            <Stars locale={locale} value={5} className="size-4" /> {h.reviews.rating(site.rating, site.reviewCount)} <Icon name="arrow" className="size-4" />
          </a>
        </Reveal>
        <ReviewMarquee locale={locale} reviews={reviews} />
      </section>

      <ClientLogos locale={locale} />

      {/* CONTACT: the lead form (WhatsApp until there's an endpoint) */}
      <section id="contact" className="container-x mt-16 scroll-mt-20 sm:mt-28">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-ink text-white sm:rounded-[2.5rem]">
          <Image src="renders/garden-office-black.webp" alt="" fill sizes="100vw" className="-z-10 object-cover opacity-35" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-l from-ink via-ink/85 to-ink/40 ltr:bg-gradient-to-r" />
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14 lg:p-14">
            <Reveal>
              <p className="eyebrow text-glow">{h.contact.eyebrow}</p>
              <h2 className="h-section mt-1">{h.contact.title}</h2>
              <p className="mt-3 text-lg leading-8 text-white/75">{h.contact.text}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a href={waLink(site.whatsappGreeting)} target="_blank" rel="noopener" className="btn-wa px-7 py-4 text-base">
                  <Icon name="whatsapp" /> {t.common.whatsapp}
                </a>
                <a href={`tel:${site.phone}`} className="btn-glass px-7 py-4 text-base" dir="ltr">
                  <Icon name="phone" className="size-5" /> {site.phone}
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-3xl bg-white p-5 text-ink shadow-lift sm:p-7">
                <h3 className="mb-4 text-xl font-extrabold">{h.contact.formTitle}</h3>
                <LeadForm />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
