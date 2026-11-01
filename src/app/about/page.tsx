import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ClientLogos } from "@/components/home/ClientLogos";
import { Icon, type IconName } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { Stars } from "@/components/Stars";
import { VerticalVideo } from "@/components/VerticalVideo";
import { productsIn, site } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "קצת עלינו",
  description: "מודובוקס מפתחת ומייצרת מבנים מודולריים בהתאמה אישית, מאלומיניום ופאנל מבודד, במפעל בקיבוץ עין חרוד מאוחד. צוות מהנדסים עם מעל 35 שנות ניסיון.",
};

/** The close-ups, as a glimpse of what leaves the factory. */
const DETAILS = [
  { src: "closeups/profiles.webp", title: "פרופילי אלומיניום", alt: "פינת מחסן מודובוקס: פרופילי אלומיניום כהים, פס זכוכית עליון וקירות לבנים" },
  { src: "closeups/wall-panels.webp", title: "פאנל מבודד XPV", alt: "קירות פאנל מבודד לבנים בין פרופילי אלומיניום" },
  { src: "closeups/skylight.webp", title: "חלונות סקיילייט", alt: "חלון סקיילייט עליון בין פרופילי אלומיניום כהים" },
  { src: "closeups/lock.webp", title: "ידית ומנעול", alt: "ידית מתכת מוברשת ומנעול צילינדר על דלת לבנה" },
];

/** How a project goes, from the first chat to the warranty (facts from the terms and warranty pages). */
const JOURNEY: { icon: IconName; title: string; text: string }[] = [
  { icon: "ruler", title: "ייעוץ ובחירה", text: "בוחרים מידה מהקטלוג, מעצבים בתלת־ממד, או מדברים עם נציג על מידה מיוחדת שמתאימה בדיוק לחצר." },
  { icon: "door", title: "תוספות ותכנון", text: "דלתות, חלונות, ויטרינה, חשמל, מזגן ורצפה, במיקום שתבחרו. המחיר שקוף ומתעדכן תוך כדי." },
  { icon: "layers", title: "הכנה במפעל", text: `המבנה מוכן במפעל שלנו ב${site.factory}, ופאנל החשמל מותקן בו כבר שם.` },
  { icon: "truck", title: "הובלה והתקנה", text: `עד ${site.installationDays} ימי עסקים מההזמנה. המתקין מתאם איתכם מועד, וההרכבה עצמה לוקחת שעות ספורות.` },
  { icon: "shield", title: "אחריות ושירות", text: `${site.warrantyYears} שנות אחריות, ושירות גם אחרי, כולל התאמה של מבנה קיים לצרכים חדשים.` },
];

export default function AboutPage() {
  const fixedSizes = productsIn("modubox").length;
  const video = site.factoryVideo;
  const hasVideo = !!(video.youtubeId.trim() || video.file.trim());
  const numbers = [
    { v: `${site.rating}`, k: `${site.reviewCount} ביקורות בגוגל`, stars: true },
    { v: "35+", k: "שנות ניסיון של צוות המהנדסים" },
    { v: `${site.warrantyYears}`, k: "שנות אחריות" },
    { v: `${fixedSizes}`, k: "מידות קבועות, ועוד בהתאמה אישית" },
  ];

  return (
    <>
      {/* HERO: the headline beside a whole photo, the numbers under it */}
      <section className="grain relative isolate overflow-hidden bg-ink pt-14 text-white sm:pt-20">
        <div className="absolute -top-40 start-[-10%] -z-10 size-[36rem] rounded-full bg-brand/20 blur-3xl" aria-hidden="true" />
        <div className="container-x grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div>
            <p className="eyebrow text-glow">
              <span className="h-px w-8 bg-glow/70" aria-hidden="true" /> קצת עלינו
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-6xl">אנחנו מודובוקס, ואנחנו יודעים לבנות מחסנים מעולים.</h1>
            <p className="mt-5 text-lg leading-8 text-white/80">מבנים מודולרים בהתאמה אישית, מאלומיניום ופאנל מבודד. מפתחים ומייצרים בעצמנו, ומביאים מהמפעל בעין חרוד עד החצר שלכם.</p>
          </div>
          <Reveal className="relative aspect-video overflow-hidden rounded-3xl bg-white/5 shadow-lift">
            <Image src="photos/7b2976de.webp" alt="יחידת מודובוקס עם דק עץ בגינה" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
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
          <p className="eyebrow">הסיפור שלנו</p>
          <h2 className="h-section mt-1">מבנה קל, בלי להתפשר על המראה</h2>
          <div className="mt-5 space-y-4 text-lg leading-8 text-ink-soft">
            <p>ב־Modubox אנחנו מפתחים ומייצרים מבנים מודולריים מחומרים קלים ומבודדים, עם דגש על איכות, מודולריות מלאה ואסתטיקה מוקפדת.</p>
            <p>הפתרונות שלנו נולדו מתוך צורך אמיתי: ליצור מבנים חכמים, עמידים ויפים, שמוסיפים שטח שימושי בלי תהליכים מורכבים.</p>
            <p>
              <strong className="text-ink">הגיע הזמן להגיד את האמת: בדרך כלל מבנים כאלה לא אסתטיים.</strong> אנחנו שמנו דגש רציני על היופי של המוצר, וכל המבנים שלנו מודולריים: אפשר לשחק עם הגודל, להוסיף חלונות ודלתות ולמקם אותם איפה שרוצים.
            </p>
          </div>
          <blockquote className="mt-7 border-s-4 border-copper ps-5 text-lg font-bold leading-8 text-ink">
            צוות המהנדסים שלנו מביא מעל 35 שנות ניסיון בבניין, אדריכלות ובנייה קלה, ובעבודה עם אלומיניום, פוליקרבונט ופאנל מבודד, כדי שהמבנה יעמוד שנים באקלים הישראלי.
          </blockquote>
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
                <Image src={src} alt="פרויקט של מודובוקס" fill sizes={wide ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"} className="object-cover" />
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
                <span className="h-px w-8 bg-copper" aria-hidden="true" /> המפעל
              </p>
              <h2 id="factory-title" className="h-section mt-2">מיוצר אצלנו, ב{site.factory}</h2>
              <p className="mt-3 text-lg leading-8 text-white/70">
                פיתוח וייצור ישראלי, מדגם רשום. השלד, הפאנלים והפתחים מוכנים במפעל שלנו, ומגיעים אליכם מוכנים להרכבה.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <ul className={`mt-8 grid grid-cols-2 gap-3 sm:gap-4 ${hasVideo ? "" : "lg:grid-cols-4"}`}>
                {DETAILS.map((d) => (
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
          <p className="eyebrow">איך זה עובד</p>
          <h2 className="h-section mt-1">מהשיחה הראשונה ועד החצר</h2>
        </Reveal>
        <ol className="relative mt-10 grid gap-6 lg:grid-cols-5 lg:gap-5">
          <span className="absolute inset-x-[10%] top-7 hidden h-px bg-gradient-to-l from-line/0 via-line to-line/0 lg:block" aria-hidden="true" />
          <span className="absolute bottom-6 start-7 top-6 w-px bg-line lg:hidden" aria-hidden="true" />
          {JOURNEY.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.07}>
              <li className="relative flex gap-4 lg:flex-col lg:items-center lg:text-center">
                <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-ink text-white shadow-lift">
                  <Icon name={s.icon} className="size-6" />
                  <span className="absolute -top-2 -start-2 grid size-6 place-items-center rounded-full bg-copper text-xs font-black text-white">{i + 1}</span>
                </span>
                <span>
                  <span className="block text-xl font-extrabold">{s.title}</span>
                  <span className="mt-1 block leading-7 text-ink-soft">{s.text}</span>
                </span>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <ClientLogos />

      {/* VISIT */}
      <section className="container-x mt-16 sm:mt-24">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-petrol p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-10">
          <div className="absolute -bottom-32 -end-24 -z-10 size-80 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
          <div>
            <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm text-white/75">
              <Stars value={5} className="size-4" /> {site.rating} · {site.reviewCount} ביקורות בגוגל
            </a>
            <h2 className="mt-2 text-3xl font-extrabold">בואו לראות מקרוב</h2>
            <p className="mt-1 text-white/75">אפשר לתאם ביקור בתצוגה במפעל, ב{site.factory}.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 sm:mt-0 sm:shrink-0">
            <Link href="/contact/" className="btn bg-white px-7 py-4 text-base text-ink hover:bg-brand-tint">תיאום ביקור</Link>
            <Link href="/shop/" className="btn-glass px-7 py-4 text-base">
              <Icon name="cube" className="size-5" /> לקטלוג
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
