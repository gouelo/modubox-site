"use client";
import { useState } from "react";
import { asset } from "@/lib/paths";
import { Icon } from "./Icon";

export interface VerticalVideoSource {
  youtubeId?: string;
  file?: string;
  poster?: string;
  caption?: string;
}

/**
 * A 9:16 video in a phone-like frame: a file plays inline with controls; a
 * YouTube id (a Short too) loads only when tapped, like VideoCard.
 */
export function VerticalVideo({ video, className = "" }: { video: VerticalVideoSource; className?: string }) {
  const [play, setPlay] = useState(false);
  const id = video.youtubeId?.trim();
  const title = video.caption || "סרטון מהמפעל";
  return (
    <figure className={className}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] bg-ink shadow-lift ring-1 ring-white/10">
        {video.file?.trim() ? (
          <video
            className="absolute inset-0 size-full object-cover"
            src={asset(video.file.trim())}
            poster={video.poster ? asset(video.poster) : undefined}
            controls
            playsInline
            preload="metadata"
            aria-label={title}
          />
        ) : play ? (
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
            <img src={video.poster ? asset(video.poster) : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover opacity-90 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
            <span className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-lift transition group-hover:scale-110">
              <Icon name="play" className="ms-1 size-7" />
            </span>
          </button>
        )}
      </div>
      {video.caption && <figcaption className="mt-3 text-center text-sm text-white/65">{video.caption}</figcaption>}
    </figure>
  );
}
