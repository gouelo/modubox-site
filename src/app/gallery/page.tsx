import type { Metadata } from "next";
import { Gallery } from "@/components/Gallery";
import { VideoCard } from "@/components/VideoCard";
import { gallery, site, videos } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "גלריה וסרטונים",
  description: "סרטונים ותמונות אמיתיות של מחסני ויחידות חצר מודובוקס אצל לקוחות.",
};

export default function GalleryPage() {
  return (
    <div className="container-x py-12">
      <header className="max-w-3xl">
        <p className="eyebrow">השראה</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">גלריה וסרטונים</h1>
        <p className="mt-4 text-lg text-ink-soft">משרדים, חדרי כושר, מחסני כביסה וחדרי אירוח – מחצרות של לקוחות בכל הארץ.</p>
      </header>
      <section className="mt-10">
        <h2 className="mb-5 text-2xl font-extrabold">סרטונים</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => <VideoCard key={v.youtubeId} id={v.youtubeId} title={v.title} />)}
        </div>
        <a href={site.social.youtube} target="_blank" rel="noopener" className="btn-ghost mt-6">לכל הסרטונים ביוטיוב</a>
      </section>
      <section className="mt-14">
        <h2 className="mb-1 text-2xl font-extrabold">תמונות מלקוחות</h2>
        <p className="mb-5 text-ink-soft">צילומים אמיתיים מהתקנות שלנו, בלי הדמיות.</p>
        <Gallery images={gallery} />
      </section>
    </div>
  );
}
