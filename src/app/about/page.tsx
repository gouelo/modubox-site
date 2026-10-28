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
      <section className="relative isolate overflow-hidden bg-ink py-24 text-white">
        <Image src="photos/7b2976de.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-40" />
        <div className="container-x max-w-3xl">
          <p className="eyebrow !text-brand">אודות</p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">אנחנו מודובוקס, ואנחנו יודעים לבנות מחסנים מעולים.</h1>
          <p className="mt-5 text-lg leading-8 text-white/80">מחפשים מבנה מבנייה קלה, איכותי באמת ובמחיר שפוי? זה בדיוק מה שאנחנו עושים.</p>
        </div>
      </section>
      <section className="container-x mt-16 grid gap-12 lg:grid-cols-2">
        <Reveal className="prose-he">
          <h2>קצת עלינו</h2>
          <p>ב־Modubox אנחנו מפתחים ומייצרים מבנים מודולריים מחומרים קלים ומבודדים, עם דגש על איכות, מודולריות מלאה ואסתטיקה מוקפדת.</p>
          <p>הפתרונות שלנו נולדו מתוך צורך אמיתי: ליצור מבנים חכמים, עמידים ויפים, שמאפשרים להוסיף שטח שימושי בלי תהליכים מורכבים ובלי להתפשר על המראה.</p>
          <p>הגיע הזמן להגיד את האמת – בדרך כלל מבנים כאלה לא אסתטיים. אנחנו שמנו דגש רציני על היופי של המוצר. וכל המבנים שלנו מודולריים: אפשר לשחק עם הגודל, להוסיף חלונות ודלתות ולמקם אותם איפה שרוצים.</p>
          <p>צוות המהנדסים שלנו מביא מעל 35 שנות ניסיון בבניין, אדריכלות ובנייה קלה, ובעבודה עם אלומיניום, פוליקרבונט ופנל מבודד – כדי להבטיח עמידות לשנים רבות באקלים הישראלי.</p>
          <blockquote>כתבה על Modubox התפרסמה במגזין "עיצוב", גיליון 249 (פברואר–מרץ 2020).</blockquote>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="grid grid-cols-2 gap-3">
            {["photos/dc5dd38c.webp", "photos/39bd9bb4.webp", "photos/64f0fa98.webp", "photos/2c981b23.webp"].map((src, i) => (
              <div key={src} className={`relative overflow-hidden rounded-3xl bg-sand ${i % 3 === 0 ? "aspect-[4/5]" : "aspect-square"}`}>
                <Image src={src} alt="פרויקט של מודובוקס" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
              </div>
            ))}
          </div>
        </Reveal>
      </section>
      <section className="container-x mt-16">
        <TrustBar />
        <div className="mt-10 rounded-3xl bg-sand p-8 sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">בואו לראות מקרוב</h2>
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
