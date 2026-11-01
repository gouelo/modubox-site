"use client";
import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import { Icon } from "./Icon";

/**
 * A row that drifts sideways forever (reviews, client logos), with a
 * pause/play button: moving content that lasts more than five seconds must
 * be stoppable (WCAG 2.2.2). It also pauses on hover and while a keyboard
 * user is inside it, and stands still for "reduce motion" (a row to scroll
 * by hand). `children` is one copy; the second copy is hidden from screen readers.
 */
export function Marquee({ children, mask, speed, label, className = "" }: { children: ReactNode; mask: string; speed: string; label: string; className?: string }) {
  const [paused, setPaused] = useState(false);
  const t = useT().motion;
  return (
    <div className="relative">
      {/* focusable: the keyboard pauses it by focusing it, and scrolls it when it stands still */}
      <div tabIndex={0} role="region" aria-label={label} className={`group relative overflow-hidden motion-reduce:overflow-x-auto ${mask}`}>
        <div
          className={`flex w-max ${speed} group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none ${paused ? "[animation-play-state:paused]" : ""} ${className}`}
        >
          {children}
          {Children.map(children, (c, i) =>
            isValidElement(c) ? cloneElement(c as ReactElement<Record<string, unknown>>, { key: `copy-${c.key ?? i}`, "aria-hidden": true, inert: true }) : c,
          )}
        </div>
      </div>
      <div className="container-x mt-2 flex justify-end motion-reduce:hidden">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-bold text-ink-soft transition hover:border-ink hover:text-ink"
        >
          {paused ? <Icon name="play" className="size-3.5" /> : <Icon name="pause" className="size-3.5" />}
          {paused ? t.play : t.pause}
        </button>
      </div>
    </div>
  );
}
