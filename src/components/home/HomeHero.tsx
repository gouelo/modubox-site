"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ltrSizes, site } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";
import { HeroTitle } from "../HeroTitle";
import { Icon } from "../Icon";
import { Reveal } from "../Reveal";

/** Yoel's pick: a Modubox garden office, the whole shed in frame. */
const PHOTO = { src: "renders/garden-office-white.webp", alt: "יחידת חצר מודובוקס לבנה עם פרופילים כהים, דלת פתוחה ומשרד בפנים, בגינה" };

/**
 * The home hero: the headline on a dark stage, then the shed full-bleed,
 * drifting slowly as the page scrolls. The photo's box keeps the whole shed
 * in view: 4:3 on phones (the shed sits in the middle 60% of the frame), and
 * from lg up a 2.1:1 frame (never wider, so cover-cropping keeps roof to base:
 * the shed fills 76% of the photo's height) that also fits under the headline
 * on short screens, where it narrows and fades into the dark at its sides.
 *
 * From lg up (round 8, "something high-end") it is a cinematic stage instead:
 * the photo, uncropped at 16:9, bleeds in from the left edge (its empty left
 * fifth off screen, so the shed starts 3vw in) and fades into the dark on the
 * right, where the headline (always two lines), pitch, buttons and a trust
 * line sit. The shed is about 1.1 times the photo's height wide, so the photo
 * is at most 40vw tall: the shed then ends at 47vw, left of the text column at
 * every width. The stage fills the screen under the header up to 42vw; on a
 * taller stage the photo sits at its bottom. It settles in slowly (Ken Burns);
 * reduced motion stops it at its end.
 */
export function HomeHero({ fromPrice, sizes, range }: { fromPrice: string; sizes: number; range: string }) {
  const ref = useRef<HTMLElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const pitch = `מחסנים, משרדי גינה ויחידות חצר, מותאמים לכם עם דלתות, חלונות, חשמל, מיזוג ורצפה. החל מ־${fromPrice}.`;
  const y = useTransform(scrollYProgress, [0, 1], still ? ["0%", "0%"] : ["0%", "14%"]);

  return (
    <section ref={ref} className="relative isolate -mt-16 overflow-hidden bg-night text-white lg:-mt-[72px]">
      <div className="absolute -top-48 start-[-10%] -z-10 size-[44rem] rounded-full bg-brand/25 blur-3xl" aria-hidden="true" />
      <div className="flex flex-col lg:relative lg:h-(--hero-h) lg:[--hero-h:clamp(32rem,100svh,42vw)] lg:justify-center lg:pt-[72px]">
        <div className="container-x grid gap-6 pt-24 lg:relative lg:z-10 lg:grid-cols-[minmax(0,40rem)] lg:gap-0 lg:pt-0">
          <div>
            <p className="eyebrow text-glow">
              <span className="h-px w-8 bg-glow/70" /> שלדת אלומיניום · פאנל מבודד XPV · ייצור ישראלי
            </p>
            <div className="mt-3">
              <HeroTitle lines={["מחסן או חדר נוסף"]} accent="בחצר שלכם." size="text-[2.75rem] sm:text-7xl lg:text-[3.75rem] xl:text-[4.75rem] lg:whitespace-nowrap" />
            </div>
          </div>
          <Reveal delay={0.45}>
            <p className="max-w-md text-lg leading-8 text-white/80 lg:mt-6 lg:text-[1.1875rem] lg:text-white/75">{pitch}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:mt-9">
              <Link href="/shop/" className="btn whitespace-nowrap bg-white px-7 py-4 text-base text-ink hover:bg-brand-tint">
                לקטלוג המחסנים <Icon name="arrow" className="size-4" />
              </Link>
              <a href={waLink(site.whatsappGreeting)} target="_blank" rel="noopener" className="btn-glass whitespace-nowrap px-7 py-4 text-base">
                <Icon name="whatsapp" className="size-5 text-wa" /> ייעוץ בוואטסאפ
              </a>
            </div>
            <p className="mt-8 hidden items-center gap-3 text-sm text-white/65 lg:flex">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <Icon name="star" className="size-4 text-star" /> {site.rating}
              </span>
              {site.reviewCount} ביקורות בגוגל
              <span className="size-1 rounded-full bg-copper" aria-hidden="true" />
              ייצור ישראלי
              <span className="size-1 rounded-full bg-copper" aria-hidden="true" />
              הובלה והתקנה
            </p>
          </Reveal>
        </div>

        <div className="relative mx-auto mt-8 aspect-[4/3] w-full sm:aspect-[16/9] lg:absolute lg:bottom-0 lg:left-[calc(3vw-var(--photo-h)*0.356)] lg:mx-0 lg:mt-0 lg:aspect-video lg:h-(--photo-h) lg:w-auto lg:overflow-hidden lg:[--photo-h:min(var(--hero-h),40vw)] lg:[mask-image:linear-gradient(to_left,transparent,black_16%)]">
          <motion.div style={{ y }} className="absolute inset-0">
            <Image
              src={PHOTO.src}
              alt={PHOTO.alt}
              fill
              priority
              sizes="100vw"
              className="animate-[heroZoom_2.6s_cubic-bezier(0.16,1,0.3,1)_both] object-cover object-[50%_62%] lg:origin-[30%_60%] lg:animate-[heroKen_16s_cubic-bezier(0.22,1,0.36,1)_both] lg:object-center"
            />
          </motion.div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-night to-transparent lg:h-40" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-night/80 to-transparent lg:h-40 lg:from-night" aria-hidden="true" />
          <div className="container-x absolute inset-x-0 bottom-4 sm:bottom-6 lg:hidden">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-night/60 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15 backdrop-blur-md sm:text-sm">
              <Icon name="sparkle" className="size-4 text-glow" /> משרד בגינה מבית מודובוקס
            </span>
          </div>
        </div>
      </div>

      <div className="container-x grid items-center gap-6 py-6 sm:py-8 lg:py-10">
        <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:divide-x sm:divide-x-reverse sm:divide-white/15">
          {[
            { v: `${site.rating}`, k: `${site.reviewCount} ביקורות בגוגל`, stars: true },
            { v: `${site.warrantyYears}`, k: "שנות אחריות" },
            { v: `${site.installationDays}`, k: "ימי עסקים להתקנה" },
            { v: `${sizes}`, k: ltrSizes(`מידות, ${range}, ועוד בהתאמה אישית`) },
          ].map(({ v, k, stars }) => (
            <div key={k} className="px-3 text-center">
              <dt className="sr-only">{k}</dt>
              <dd className="flex items-center justify-center gap-2 font-display text-3xl font-extrabold sm:text-4xl">
                {v}
                {stars && <Icon name="star" className="size-6 text-star sm:size-7" />}
              </dd>
              <dd className="mt-0.5 text-xs text-white/65 sm:text-sm">{k}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
