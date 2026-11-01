import type { Metadata } from "next";
import { Gallery } from "@/components/Gallery";
import { VideoCard } from "@/components/VideoCard";
import { dict, type Locale } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { catalog } from "@/lib/catalog";

export const galleryMeta = (locale: Locale): Metadata => pageMeta(locale, "/gallery/", dict(locale).meta.gallery);

export function GalleryPage({ locale }: { locale: Locale }) {
  const { gallery, site, videos } = catalog(locale);
  const t = dict(locale).galleryPage;
  return (
    <div className="container-x py-12">
      <header className="max-w-3xl">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{t.title}</h1>
        <p className="mt-4 text-lg text-ink-soft">{t.text}</p>
      </header>
      <section className="mt-10">
        <h2 className="mb-5 text-2xl font-extrabold">{t.videos}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => <VideoCard key={v.youtubeId} id={v.youtubeId} title={v.title} />)}
        </div>
        <a href={site.social.youtube} target="_blank" rel="noopener" className="btn-ghost mt-6">{t.all}</a>
      </section>
      <section className="mt-14">
        <h2 className="mb-1 text-2xl font-extrabold">{t.photos}</h2>
        <p className="mb-5 text-ink-soft">{t.photosText}</p>
        <Gallery images={gallery} />
      </section>
    </div>
  );
}
