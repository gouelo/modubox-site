import type { Metadata } from "next";
import { Gallery } from "@/components/Gallery";
import { VideoCard } from "@/components/VideoCard";
import { gallery, products, site, videos } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "גלריה וסרטונים",
  description: "תמונות של מחסני ויחידות חצר מודובוקס אצל לקוחות, הדמיות וסרטוני התקנה.",
};

export default function GalleryPage() {
  const seen = new Set(gallery.map((g) => g.src));
  const more = products
    .filter((p) => p.category === "modubox")
    .flatMap((p) => p.images.map((src) => ({ src, alt: p.name })))
    .filter((g) => !seen.has(g.src) && (seen.add(g.src), true));
  return (
    <div className="container-x py-12">
      <header className="max-w-3xl">
        <p className="eyebrow">השראה</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">גלריה וסרטונים</h1>
        <p className="mt-4 text-lg text-ink-soft">משרדים, חדרי כושר, מחסני כביסה וחדרי אירוח – מחצרות של לקוחות בכל הארץ.</p>
      </header>
      <section className="mt-10">
        <h2 className="mb-5 text-2xl font-black">סרטונים</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => <VideoCard key={v.youtubeId} id={v.youtubeId} title={v.title} />)}
        </div>
        <a href={site.social.youtube} target="_blank" rel="noopener" className="btn-ghost mt-6">לכל הסרטונים ביוטיוב</a>
      </section>
      <section className="mt-14">
        <h2 className="mb-5 text-2xl font-black">תמונות</h2>
        <Gallery images={[...gallery, ...more]} />
      </section>
    </div>
  );
}
