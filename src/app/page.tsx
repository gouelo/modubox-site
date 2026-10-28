import Image from "next/image";
import Link from "next/link";
import { Faq } from "@/components/Faq";
import { Gallery } from "@/components/Gallery";
import { Icon } from "@/components/Icon";
import { LeadForm } from "@/components/LeadForm";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { ReviewCard } from "@/components/ReviewCard";
import { SectionHeading } from "@/components/SectionHeading";
import { Stars } from "@/components/Stars";
import { TrustBar } from "@/components/TrustBar";
import { VideoCard } from "@/components/VideoCard";
import { categories, gallery, lowestPrice, ltrSizes, productsIn, reviews, site, videos } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

const USES = [
  { title: "משרד בחצר", img: "photos/dc5dd38c.webp", text: "שקט, מבודד ו־30 שניות הליכה מהבית" },
  { title: "חדר כושר ביתי", img: "photos/39bd9bb4.webp", text: "מקום לציוד, למזרן ולמזגן" },
  { title: "מחסן כביסה", img: "photos/64f0fa98.webp", text: "מכונה ומייבש מחוץ לבית" },
  { title: "חדר אירוח", img: "photos/f1889911.webp", text: "יחידת חצר נעימה לאורחים" },
  { title: "מחסן אופניים וגינה", img: "photos/218563be.webp", text: "הכול מסודר, יבש ונעול" },
  { title: "קליניקה וסטודיו", img: "photos/3b0700d0.webp", text: "עסק קטן – בלי לשכור מקום" },
];

const WHY = [
  { title: "פיתוח ישראלי ייחודי", text: "מדגם רשום, בעיצוב נקי ויוקרתי שמשתלב ליד הבית." },
  { title: "אטימות מרבית", text: "פנל מבודד XPV – הגנה מגשם, אבק, מזיקים, חום וקור." },
  { title: "דלת רחבה כלולה", text: "דלת עם מנעול, רוחב 93 ס\"מ וגובה 195 ס\"מ – בכל צד שתבחרו." },
  { title: "סקיילייט כסטנדרט", text: "פס חלונות עליון לאור טבעי, כלול במפרט הבסיסי." },
  { title: "שלדת אלומיניום", text: "פרופילים בצביעה אלקטרו־סטטית שלא מחלידים. רצפה מוגבהת איטלקית." },
  { title: "מודולרי באמת", text: "אפשר להגדיל, להקטין, להוסיף דלתות וחלונות – ואפילו להעביר דירה." },
];

export default function Home() {
  const sheds = productsIn("modubox");
  const featured = ["modubox-2x1", "modubox-2x2", "modubox-3x2", "modubox-4x2"].map((s) => sheds.find((p) => p.slug === s)!).filter(Boolean);

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <Image src="photos/2c981b23.webp" alt="יחידת חצר של מודובוקס עם קיר ויטרינה בשקיעה" fill priority sizes="100vw" className="-z-10 object-cover opacity-80" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-ink/90 via-ink/60 to-ink/10" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink/80 to-transparent" />
        <div className="container-x flex min-h-[86svh] flex-col justify-end pb-10 pt-24 sm:min-h-[78vh] lg:justify-center lg:pb-16">
          <Reveal className="max-w-2xl">
            <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold backdrop-blur hover:bg-white/20">
              <Stars value={5} className="size-3.5" />
              {site.rating} · {site.reviewCount} ביקורות בגוגל
            </a>
            <h1 className="text-[2.6rem] font-black leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              החצר שלכם.
              <br />
              <span className="text-brand">עוד חדר.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/85 sm:text-xl">
              מחסני גינה, משרדים ויחידות חצר מפנל מבודד ושלדת אלומיניום. מעוצבים, אטומים ומותקנים אצלכם תוך ימים – עם {site.warrantyYears} שנות אחריות.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/configurator/" className="btn-brand px-7 py-4 text-base">
                <Icon name="cube" /> עצבו את המחסן שלכם ב־3D
              </Link>
              <a href={waLink(site.whatsappGreeting)} target="_blank" rel="noopener" className="btn-wa px-7 py-4 text-base">
                <Icon name="whatsapp" /> ייעוץ מהיר בוואטסאפ
              </a>
            </div>
            <p className="mt-5 text-white/70">
              החל מ־<strong className="text-white">{formatILS(lowestPrice("modubox"))}</strong> · עד {site.maxPayments} תשלומים
            </p>
          </Reveal>
        </div>
      </section>

      <div className="container-x -mt-px pt-6">
        <TrustBar />
      </div>

      {/* CATALOG BY SIZE */}
      <section className="container-x mt-20" id="sizes">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="קטלוג המידות" title={ltrSizes("מ־1×0.80 ועד 6×3 מטר")}>
              {sheds.length} מידות סטנדרטיות – ובהתאמה אישית לכל מידה אחרת. בחרו מידה, הוסיפו תוספות, וראו את המחיר מתעדכן.
            </SectionHeading>
            <Link href="/shop/" className="btn-ghost mb-10">לכל המחסנים <Icon name="arrow" className="size-4" /></Link>
          </div>
        </Reveal>
        <div className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {sheds.map((p) => (
            <Link key={p.slug} href={`/product/${p.slug}/`} className="shrink-0 rounded-2xl border border-line bg-white px-4 py-2.5 text-center transition hover:-translate-y-0.5 hover:border-ink hover:shadow-soft">
              <span className="block text-lg font-black" dir="ltr">{p.sizeLabel}</span>
              <span className="block text-xs text-ink-soft">{formatILS(p.price)}</span>
            </Link>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* CONFIGURATOR TEASER */}
      <section className="container-x mt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-ink text-white">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div className="relative order-2 p-7 sm:p-12 lg:order-1">
                <p className="eyebrow !text-brand">חדש באתר</p>
                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">בנו את מחסן החלומות שלכם – בתלת־ממד</h2>
                <p className="mt-4 text-lg leading-8 text-white/75">
                  בחרו מידה, צבע פרופיל, דלת כפולה, חלונות, קיר ויטרינה, מזגן ומדפים – וראו את המחסן משתנה מול העיניים, עם המחיר המדויק. אהבתם? לסל או ישר אלינו לוואטסאפ.
                </p>
                <ul className="mt-6 grid gap-2 text-white/85 sm:grid-cols-2">
                  {["סיבוב 360° ומבט פנימה", "מחיר שמתעדכן בזמן אמת", "שליחת התצורה בוואטסאפ", "קישור לשיתוף עם המשפחה"].map((t) => (
                    <li key={t} className="flex items-center gap-2"><Icon name="check" className="size-5 text-brand" /> {t}</li>
                  ))}
                </ul>
                <Link href="/configurator/" className="btn-brand mt-8 px-7 py-4 text-base">
                  <Icon name="cube" /> לקונפיגורטור
                </Link>
              </div>
              <div className="relative order-1 aspect-[4/3] lg:order-2 lg:aspect-auto lg:h-full lg:min-h-[480px]">
                <Image src="brand/configurator-preview.webp" alt="הקונפיגורטור התלת־ממדי של מודובוקס" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent lg:bg-gradient-to-l" />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* USES */}
      <section className="container-x mt-24">
        <Reveal>
          <SectionHeading eyebrow="פתרון אחד, אינספור שימושים" title="מה תעשו עם עוד חדר?" />
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {USES.map((u, i) => (
            <Reveal key={u.title} delay={(i % 3) * 0.06}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-3xl bg-sand sm:aspect-[4/3]">
                <Image src={u.img} alt={u.title} fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                  <h3 className="text-lg font-extrabold sm:text-xl">{u.title}</h3>
                  <p className="text-sm text-white/80">{u.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="mt-24 bg-sand py-20">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <SectionHeading eyebrow="למה מודובוקס" title="מחסן שנראה כמו חלק מהבית">
              בדרך כלל מבנים כאלה לא אסתטיים. אנחנו שמנו דגש רציני על היופי של המוצר – בלי להתפשר על חוזק, בידוד ואטימות. צוות המהנדסים שלנו מביא מעל 35 שנות ניסיון.
            </SectionHeading>
            <Link href="/about/" className="btn-ghost">עוד עלינו</Link>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHY.map((w, i) => (
              <Reveal key={w.title} delay={(i % 2) * 0.06}>
                <div className="h-full rounded-3xl bg-white p-6 shadow-soft">
                  <span className="mb-4 grid size-11 place-items-center rounded-xl bg-brand-tint text-brand-dark"><Icon name="check" /></span>
                  <h3 className="text-lg font-extrabold">{w.title}</h3>
                  <p className="mt-1.5 leading-7 text-ink-soft">{w.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="container-x mt-24" id="reviews">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="לקוחות מפרגנים" title="מה אומרים עלינו">
              {site.reviewCount} לקוחות דירגו אותנו בגוגל. הנה כמה מהם.
            </SectionHeading>
            <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="mb-10 flex items-center gap-4 rounded-3xl bg-white p-4 pe-6 shadow-soft ring-1 ring-line transition hover:shadow-lift">
              <span className="text-5xl font-black">{site.rating}</span>
              <span>
                <Stars value={5} className="size-5" />
                <span className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft"><Icon name="google" className="size-4" /> {site.reviewCount} ביקורות בגוגל</span>
              </span>
            </a>
          </div>
        </Reveal>
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {reviews.slice(0, 9).map((r) => (
            <ReviewCard key={r.name} {...r} />
          ))}
        </div>
      </section>

      {/* VIDEOS */}
      <section className="mt-24 bg-ink py-20 text-white">
        <div className="container-x">
          <Reveal>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="eyebrow !text-brand">רואים את זה קורה</p>
                <h2 className="h-section mt-3">מתקינים מחסן בשעות – לא בשבועות</h2>
              </div>
              <a href={site.social.youtube} target="_blank" rel="noopener" className="btn border border-white/20 text-white hover:bg-white/10">
                <Icon name="youtube" /> לערוץ היוטיוב
              </a>
            </div>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <VideoCard key={v.youtubeId} id={v.youtubeId} title={v.title} />
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="container-x mt-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="גלריה" title="השראה מהחצרות של הלקוחות" />
            <Link href="/gallery/" className="btn-ghost mb-10">לגלריה המלאה <Icon name="arrow" className="size-4" /></Link>
          </div>
        </Reveal>
        <Gallery images={gallery.slice(0, 12)} />
      </section>

      {/* OTHER CATEGORIES */}
      <section className="container-x mt-24">
        <div className="grid gap-4 md:grid-cols-2">
          {categories.slice(1).map((c) => {
            const items = productsIn(c.id);
            return (
              <Link key={c.id} href={`/shop/#${c.id}`} className="group relative flex min-h-64 overflow-hidden rounded-3xl bg-ink p-7 text-white">
                <Image src={items[items.length - 1].images[0]} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="-z-0 object-cover opacity-60 transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-ink/10" />
                <div className="relative mt-auto">
                  <h3 className="text-2xl font-black">{c.title}</h3>
                  <p className="text-white/75">{c.subtitle}</p>
                  <p className="mt-2 font-bold text-brand">החל מ־{formatILS(lowestPrice(c.id))} ←</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="container-x mt-24 grid gap-10 lg:grid-cols-[1fr_1.6fr]" id="faq">
        <Reveal>
          <SectionHeading eyebrow="שאלות נפוצות" title="כל מה שרציתם לדעת">
            לא מצאתם תשובה? כתבו לנו בוואטסאפ – אנחנו עונים מהר.
          </SectionHeading>
          <a href={waLink("היי מודובוקס, יש לי שאלה:")} target="_blank" rel="noopener" className="btn-wa">
            <Icon name="whatsapp" /> שאלו אותנו
          </a>
        </Reveal>
        <Faq />
      </section>

      {/* CONTACT */}
      <section className="container-x mt-24" id="contact">
        <div className="grid overflow-hidden rounded-[2rem] bg-ink text-white lg:grid-cols-2">
          <div className="p-7 sm:p-12">
            <p className="eyebrow !text-brand">דברו איתנו</p>
            <h2 className="h-section mt-3">נעזור לכם לבחור את המבנה המתאים</h2>
            <p className="mt-4 text-lg leading-8 text-white/75">השאירו פרטים ונחזור אליכם, או דברו איתנו עכשיו. אפשר גם לתאם ביקור בתצוגה במפעל.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a href={waLink(site.whatsappGreeting)} target="_blank" rel="noopener" className="btn-wa py-4"><Icon name="whatsapp" /> וואטסאפ</a>
              <a href={`tel:${site.phone}`} className="btn border border-white/20 py-4 text-white hover:bg-white/10"><Icon name="phone" /> <span dir="ltr">{site.phone}</span></a>
            </div>
            <p className="mt-6 flex items-start gap-2 text-white/70"><Icon name="pin" className="mt-0.5 size-5 shrink-0 text-brand" /> מפעל ראשי: {site.factory} · מפעל משני: {site.factory2}</p>
          </div>
          <div className="bg-white/5 p-7 sm:p-12">
            <LeadForm dark />
          </div>
        </div>
      </section>
    </>
  );
}
