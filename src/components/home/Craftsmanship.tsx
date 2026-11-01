import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { dict, type Locale } from "@/i18n";

/** Yoel's close-ups of the shed, 16:9 and shown whole (their words: dictionary craft.details). */
const PHOTOS = ["closeups/profiles.webp", "closeups/skylight.webp", "closeups/wall-panels.webp", "closeups/door.webp", "closeups/lock.webp"];

/** Close-ups of the shed's details, after Materials: what the product looks like up close. */
export function Craftsmanship({ locale }: { locale: Locale }) {
  const t = dict(locale).craft;
  const details = PHOTOS.map((src, i) => ({ src, ...t.details[i] }));
  return (
    <section className="grain mt-16 bg-ink py-14 text-white sm:mt-28 sm:py-24" aria-labelledby="craft-title">
      <div className="container-x">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-copper">
            <span className="h-px w-8 bg-copper" aria-hidden="true" /> {t.eyebrow}
          </p>
          <h2 id="craft-title" className="h-section mt-2">{t.title}</h2>
          <p className="mt-3 text-lg leading-8 text-white/70">{t.text}</p>
        </Reveal>

        {/* one reveal for the whole row: on phones it scrolls sideways, and cards off-screen would never come into view */}
        <Reveal delay={0.1}>
          <ol tabIndex={0} aria-labelledby="craft-title" className="no-scrollbar -mx-5 mt-8 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:mt-12 sm:scroll-px-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-6">
            {details.map((d, i) => (
              <li key={d.src} className={`w-[86%] shrink-0 snap-start sm:w-auto ${i < 2 ? "lg:col-span-3" : "lg:col-span-2"} ${i === 0 ? "sm:col-span-2" : ""}`}>
                <figure className="group">
                  <div className="relative aspect-video overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 sm:rounded-3xl">
                    <Image
                      src={d.src}
                      alt={d.alt}
                      fill
                      sizes={i < 2 ? "(min-width:1024px) 48vw, (min-width:640px) 96vw, 86vw" : "(min-width:1024px) 31vw, (min-width:640px) 48vw, 86vw"}
                      className="object-cover transition duration-[1.6s] ease-(--ease-out-expo) group-hover:scale-[1.03]"
                    />
                  </div>
                  <figcaption className="mt-4 flex gap-3">
                    <span className="pt-1 text-xs font-bold tabular-nums tracking-[0.12em] text-copper" dir="ltr">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="block text-lg font-extrabold sm:text-xl">{d.title}</span>
                      <span className="mt-1 block leading-7 text-white/65">{d.text}</span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-white/60 sm:hidden" aria-hidden="true">{t.swipe}</p>
        </Reveal>
      </div>
    </section>
  );
}
