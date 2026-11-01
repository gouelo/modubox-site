import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ClientLogos } from "@/components/home/ClientLogos";
import { Icon, type IconName } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { Stars } from "@/components/Stars";
import { VerticalVideo } from "@/components/VerticalVideo";
import { dict, lp, type Locale } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { catalog, productsIn } from "@/lib/catalog";

export const aboutMeta = (locale: Locale): Metadata => pageMeta(locale, "/about/", dict(locale).meta.about);

/** The close-ups, as a glimpse of what leaves the factory (their words: dictionary about.details). */
const DETAILS = ["closeups/profiles.webp", "closeups/wall-panels.webp", "closeups/skylight.webp", "closeups/lock.webp"];

/** How a project goes, from the first chat to the warranty (facts from the terms and warranty pages; words: about.journey). */
const JOURNEY_ICONS: IconName[] = ["ruler", "door", "layers", "truck", "shield"];

export function AboutPage({ locale }: { locale: Locale }) {
  const { site } = catalog(locale);
  const t = dict(locale);
  const a = t.about;
  const vals = { factory: site.factory, days: site.installationDays, years: site.warrantyYears, payments: site.maxPayments };
  const details = DETAILS.map((src, i) => ({ src, ...a.details[i] }));
  const journey = a.journey.map((s, i) => ({ icon: JOURNEY_ICONS[i], title: s.title, text: s.text(vals) }));
  const fixedSizes = productsIn("modubox").length;
  const video = site.factoryVideo;
  const hasVideo = !!(video.youtubeId.trim() || video.file.trim());
  const numbers = [
    { v: `${site.rating}`, k: t.common.reviewsOnGoogle(site.reviewCount), stars: true },
    { v: "35+", k: a.numbers.engineers },
    { v: `${site.warrantyYears}`, k: a.numbers.warranty },
    { v: `${fixedSizes}`, k: a.numbers.sizes },
  ];

  return (
    <>
      {/* HERO: the headline beside a whole photo, the numbers under it */}
      <section className="grain relative isolate overflow-hidden bg-ink pt-14 text-white sm:pt-20">
        <div className="absolute -top-40 start-[-10%] -z-10 size-[36rem] rounded-full bg-brand/20 blur-3xl" aria-hidden="true" />
        <div className="container-x grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div>
            <p className="eyebrow text-glow">
              <span className="h-px w-8 bg-glow/70" aria-hidden="true" /> {a.eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-6xl">{a.title}</h1>
            <p className="mt-5 text-lg leading-8 text-white/80">{a.text}</p>
          </div>
          <Reveal className="relative aspect-video overflow-hidden rounded-3xl bg-white/5 shadow-lift">
            <Image src="photos/7b2976de.webp" alt={a.heroAlt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </Reveal>
        </div>
        <div className="container-x mt-12 border-t border-white/10 py-8 sm:mt-16 sm:py-10">
          <dl className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
            {numbers.map(({ v, k, stars }, i) => (
              <div key={k} className={`px-3 text-center ${i > 0 ? "sm:border-s sm:border-white/15" : ""}`}>
                <dt className="sr-only">{k}</dt>
                <dd className="flex items-center justify-center gap-2 font-display text-4xl font-extrabold sm:text-5xl">
                  {v}
                  {stars && <Icon name="star" className="size-7 text-star" />}
                </dd>
                <dd className="mt-1 text-xs text-white/65 sm:text-sm">{k}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* STORY */}
      <section className="container-x mt-16 grid gap-10 sm:mt-24 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
        <Reveal>
          <p className="eyebrow">{a.story.eyebrow}</p>
          <h2 className="h-section mt-1">{a.story.title}</h2>
          <div className="mt-5 space-y-4 text-lg leading-8 text-ink-soft">
            <p>{a.story.p1}</p>
            <p>{a.story.p2}</p>
            <p>
              <strong className="text-ink">{a.story.p3strong}</strong>
              {a.story.p3}
            </p>
          </div>
          <blockquote className="mt-7 border-s-4 border-copper ps-5 text-lg font-bold leading-8 text-ink">{a.story.quote}</blockquote>
        </Reveal>
        <Reveal delay={0.1}>
          {/* each photo in its own 16:9 frame, like the photos, so nothing is cropped */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { src: "photos/dc5dd38c.webp", wide: true },
              { src: "photos/39bd9bb4.webp" },
              { src: "photos/64f0fa98.webp" },
            ].map(({ src, wide }) => (
              <div key={src} className={`relative aspect-video overflow-hidden rounded-3xl bg-sand ${wide ? "col-span-2" : ""}`}>
                <Image src={src} alt={a.story.photoAlt} fill sizes={wide ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"} className="object-cover" />
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FACTORY: the close-ups, and Yoel's vertical video from the factory once site.json names one */}
      <section className="grain mt-16 bg-night py-14 text-white sm:mt-28 sm:py-24" aria-labelledby="factory-title">
        <div className={`container-x grid gap-10 ${hasVideo ? "lg:grid-cols-[1fr_20rem] lg:items-center lg:gap-14" : ""}`}>
          <div>
            <Reveal className="max-w-2xl">
              <p className="eyebrow text-copper">
                <span className="h-px w-8 bg-copper" aria-hidden="true" /> {a.factory.eyebrow}
              </p>
              <h2 id="factory-title" className="h-section mt-2">{a.factory.title(site.factory)}</h2>
              <p className="mt-3 text-lg leading-8 text-white/70">{a.factory.text}</p>
            </Reveal>
            <Reveal delay={0.1}>
              <ul className={`mt-8 grid grid-cols-2 gap-3 sm:gap-4 ${hasVideo ? "" : "lg:grid-cols-4"}`}>
                {details.map((d) => (
                  <li key={d.src}>
                    <figure className="group">
                      <div className="relative aspect-video overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
                        <Image src={d.src} alt={d.alt} fill sizes={hasVideo ? "(min-width:1024px) 22vw, 50vw" : "(min-width:1024px) 24vw, 50vw"} className="object-cover transition duration-[1.6s] ease-(--ease-out-expo) group-hover:scale-[1.04]" />
                      </div>
                      <figcaption className="mt-2 text-sm font-bold text-white/80">{d.title}</figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          {hasVideo && (
            <Reveal delay={0.15} className="mx-auto w-full max-w-[20rem]">
              <VerticalVideo video={video} />
            </Reveal>
          )}
        </div>
      </section>

      {/* JOURNEY: how a project goes */}
      <section className="container-x mt-16 sm:mt-28">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">{a.journeyEyebrow}</p>
          <h2 className="h-section mt-1">{a.journeyTitle}</h2>
        </Reveal>
        <ol className="relative mt-10 grid gap-6 lg:grid-cols-5 lg:gap-5">
          <span className="absolute inset-x-[10%] top-7 hidden h-px bg-gradient-to-l from-line/0 ltr:bg-gradient-to-r via-line to-line/0 lg:block" aria-hidden="true" />
          <span className="absolute bottom-6 start-7 top-6 w-px bg-line lg:hidden" aria-hidden="true" />
          {journey.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 0.07} className="relative flex gap-4 lg:flex-col lg:items-center lg:text-center">
              <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-ink text-white shadow-lift">
                <Icon name={s.icon} className="size-6" />
                <span className="absolute -top-2 -start-2 grid size-6 place-items-center rounded-full bg-copper-deep text-xs font-black text-white">{i + 1}</span>
              </span>
              <span>
                <span className="block text-xl font-extrabold">{s.title}</span>
                <span className="mt-1 block leading-7 text-ink-soft">{s.text}</span>
              </span>
            </Reveal>
          ))}
        </ol>
      </section>

      <ClientLogos locale={locale} />

      {/* VISIT */}
      <section className="container-x mt-16 sm:mt-24">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-petrol p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-10">
          <div className="absolute -bottom-32 -end-24 -z-10 size-80 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
          <div>
            <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm text-white/75">
              <Stars locale={locale} value={5} className="size-4" /> {site.rating} · {t.common.reviewsOnGoogle(site.reviewCount)}
            </a>
            <h2 className="mt-2 text-3xl font-extrabold">{a.visit.title}</h2>
            <p className="mt-1 text-white/75">{a.visit.text(site.factory)}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 sm:mt-0 sm:shrink-0">
            <Link href={lp(locale, "/contact/")} className="btn bg-white px-7 py-4 text-base text-ink hover:bg-brand-tint">{a.visit.book}</Link>
            <Link href={lp(locale, "/shop/")} className="btn-glass px-7 py-4 text-base">
              <Icon name="cube" className="size-5" /> {t.common.toCatalog}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
