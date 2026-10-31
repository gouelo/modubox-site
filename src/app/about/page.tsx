import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { TrustBar } from "@/components/TrustBar";
import { site } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "אודות מודובוקס",
  description: "מודובוקס מפתחת ומייצרת מבנים מודולריים מחומרים קלים ומבודדים – מחסני גינה, משרדים ויחידות חצר. צוות מהנדסים עם מעל 35 שנות ניסיון.",
};

export default function AboutPage() {
  return (
    <>
      {/* the photo in its own 16:9 frame beside the headline, so the whole unit shows */}
      <section className="relative isolate overflow-hidden bg-ink py-14 text-white sm:py-20">
        <div className="absolute -top-40 start-[-10%] -z-10 size-[36rem] rounded-full bg-brand/20 blur-3xl" aria-hidden="true" />
        <div className="container-x grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div>
            <p className="eyebrow !text-brand">אודות</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-6xl">אנחנו מודובוקס, ואנחנו יודעים לבנות מחסנים מעולים.</h1>
            <p className="mt-5 text-lg leading-8 text-white/80">מחפשים מבנה מבנייה קלה, איכותי באמת ובמחיר שפוי? זה בדיוק מה שאנחנו עושים.</p>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-3xl bg-white/5 shadow-lift">
            <Image src="photos/7b2976de.webp" alt="יחידת מודובוקס עם דק עץ בגינה" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>
      <section className="container-x mt-16 grid gap-12 lg:grid-cols-2">
        <Reveal className="prose-he">
          <h2>קצת עלינו</h2>
          <p>ב־Modubox אנחנו מפתחים ומייצרים מבנים מודולריים מחומרים קלים ומבודדים, עם דגש על איכות, מודולריות מלאה ואסתטיקה מוקפדת.</p>
          <p>הפתרונות שלנו נולדו מתוך צורך אמיתי: ליצור מבנים חכמים, עמידים ויפים, שמאפשרים להוסיף שטח שימושי בלי תהליכים מורכבים ובלי להתפשר על המראה.</p>
          <p>הגיע הזמן להגיד את האמת – בדרך כלל מבנים כאלה לא אסתטיים. אנחנו שמנו דגש רציני על היופי של המוצר. וכל המבנים שלנו מודולריים: אפשר לשחק עם הגודל, להוסיף חלונות ודלתות ולמקם אותם איפה שרוצים.</p>
          <p>צוות המהנדסים שלנו מביא מעל 35 שנות ניסיון בבניין, אדריכלות ובנייה קלה, ובעבודה עם אלומיניום, פוליקרבונט ופנל מבודד – כדי להבטיח עמידות לשנים רבות באקלים הישראלי.</p>
        </Reveal>
        <Reveal delay={0.1}>
          {/* each photo in its own frame (16:9, like the photos), so nothing is cropped */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { src: "photos/dc5dd38c.webp", ratio: "aspect-video", wide: true },
              { src: "photos/39bd9bb4.webp", ratio: "aspect-video" },
              { src: "photos/64f0fa98.webp", ratio: "aspect-video" },
            ].map(({ src, ratio, wide }) => (
              <div key={src} className={`relative overflow-hidden rounded-3xl bg-sand ${ratio} ${wide ? "col-span-2" : ""}`}>
                <Image src={src} alt="פרויקט של מודובוקס" fill sizes={wide ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"} className="object-cover" />
              </div>
            ))}
          </div>
        </Reveal>
      </section>
      <section className="container-x mt-16">
        <TrustBar />
        <div className="mt-10 rounded-3xl bg-sand p-8 sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">בואו לראות מקרוב</h2>
            <p className="mt-1 text-ink-soft">אפשר לתאם ביקור בתצוגה במפעל – {site.factory}.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 sm:mt-0">
            <Link href="/contact/" className="btn-primary">תיאום ביקור</Link>
            <Link href="/shop/" className="btn-ghost"><Icon name="cube" /> לקטלוג</Link>
          </div>
        </div>
      </section>
    </>
  );
}
