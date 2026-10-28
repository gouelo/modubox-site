"use client";
import { useState } from "react";
import { Icon } from "./Icon";

/** YouTube that loads only when tapped – keeps the page fast. */
export function VideoCard({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl bg-ink shadow-soft">
      <div className="relative aspect-video">
        {play ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0" aria-label={`ניגון: ${title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover opacity-90 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
            <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-lift transition group-hover:scale-110">
              <Icon name="play" className="ms-1 size-7" />
            </span>
          </button>
        )}
      </div>
      <p className="px-4 py-3 text-[15px] font-semibold text-white">{title}</p>
    </div>
  );
}
