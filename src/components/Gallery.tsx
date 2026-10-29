"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "./Icon";

export interface GalleryImage {
  src: string;
  alt: string;
}

/** A photo grid that opens a full-screen, swipeable viewer. */
export function Gallery({ images, layout = "masonry" }: { images: GalleryImage[]; layout?: "masonry" | "strip" }) {
  const [index, setIndex] = useState<number | null>(null);
  const close = useCallback(() => setIndex(null), []);
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(1);
      if (e.key === "ArrowRight") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, step]);

  return (
    <>
      {layout === "masonry" ? (
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
          {images.map((img, i) => (
            <button key={img.src + i} type="button" onClick={() => setIndex(i)} className="group relative block w-full overflow-hidden rounded-2xl bg-sand">
              <Image src={img.src} alt={img.alt} width={800} height={i % 3 === 0 ? 1000 : 600} sizes="(min-width:1024px) 25vw, 50vw" className="h-auto w-full object-cover transition duration-700 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 text-start text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">{img.alt}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {images.map((img, i) => (
            <button key={img.src + i} type="button" onClick={() => setIndex(i)} className="relative aspect-[4/3] w-24 shrink-0 snap-start overflow-hidden rounded-xl bg-sand sm:w-28" aria-label={`הגדלת ${img.alt}`}>
              <Image src={img.src} alt="" fill sizes="112px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {index !== null && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="צפייה בתמונה"
            onClick={close}
          >
            <motion.div
              key={index}
              className="relative h-[80vh] w-[94vw] max-w-6xl"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) step(1);
                else if (info.offset.x < -80) step(-1);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image src={images[index].src} alt={images[index].alt} fill sizes="94vw" className="object-contain" />
            </motion.div>
            <p className="absolute bottom-5 inset-x-0 text-center text-sm text-white/80">
              {images[index].alt} · {index + 1}/{images.length}
            </p>
            <button type="button" onClick={close} aria-label="סגירה" className="absolute top-4 end-4 grid size-11 place-items-center rounded-full bg-white/10 text-white">
              <Icon name="close" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="הקודמת" className="absolute start-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white sm:grid">
              <Icon name="arrow" className="size-6 rotate-180" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="הבאה" className="absolute end-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white sm:grid">
              <Icon name="arrow" className="size-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
