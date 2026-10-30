"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatILS } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { Footprint } from "../Footprint";
import { Icon } from "../Icon";

export interface PickerSize {
  slug: string;
  sizeLabel: string;
  widthM: number;
  depthM: number;
  areaM2: number;
  price: number;
  popular: boolean;
}

export interface PickerTile {
  id: string;
  name: string;
  image?: string;
  price: number | null | undefined;
}

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * "Start building" on the home page: the builder lives on each size's page,
 * so the visitor picks a size first, in a sheet of every Modubox size, and
 * lands on that size's builder. The add-on tiles open the same sheet.
 */
export function BuildLauncher({ sizes, tiles, children }: { sizes: PickerSize[]; tiles: PickerTile[]; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const mounted = useHydrated();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sheet = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="size-picker-title">
          <motion.button
            type="button"
            aria-label="סגירה"
            className="absolute inset-0 bg-night/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            className="relative max-h-[88svh] w-full max-w-4xl overflow-y-auto rounded-t-[2rem] bg-white p-5 text-ink shadow-lift sm:rounded-[2rem] sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">שלב 1 מתוך 2</p>
                <h2 id="size-picker-title" className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">באיזו מידה המחסן שלכם?</h2>
                <p className="mt-1 text-ink-soft">בוחרים מידה, ובדף שלה ממשיכים לצבע ולתוספות.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-11 shrink-0 place-items-center rounded-full bg-sand transition hover:bg-sand-deep" aria-label="סגירה">
                <Icon name="close" className="size-5" />
              </button>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {sizes.map((s, i) => (
                <motion.li key={s.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 + i * 0.02, ease }}>
                  <Link
                    href={`/product/${s.slug}/#build`}
                    className={`group relative flex h-full items-center gap-3 rounded-2xl border p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand hover:shadow-soft ${s.popular ? "border-brand/40 bg-brand-tint/40" : "border-line"}`}
                  >
                    <Footprint w={s.widthM} d={s.depthM} className="size-11 shrink-0 text-ink sm:size-12" />
                    <span className="min-w-0">
                      <span className="block font-display text-2xl font-extrabold leading-none" dir="ltr">{s.sizeLabel}</span>
                      <span className="mt-1 block text-xs text-ink-soft">
                        {s.areaM2} מ&quot;ר · {formatILS(s.price)}
                      </span>
                    </span>
                    {s.popular && <span className="absolute -top-2 end-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">פופולרי</span>}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="no-scrollbar mt-10 flex snap-x gap-3 overflow-x-auto px-5 sm:px-6 lg:px-8">
        {tiles.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setOpen(true)}
            className="group relative h-52 w-40 shrink-0 snap-start overflow-hidden rounded-2xl bg-white/10 text-start sm:h-64 sm:w-52"
          >
            {a.image && <Image src={a.image} alt={a.name} fill sizes="208px" className="object-cover transition duration-1000 group-hover:scale-110" />}
            <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="text-sm font-bold leading-snug">{a.name}</p>
              <p className="text-xs text-glow">{a.price ? `+${formatILS(a.price)}` : a.price === 0 ? "לפי מ\"ר" : "מחיר בתיאום"}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="container-x mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
        <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => setOpen(true)} className="btn bg-white px-7 py-4 text-base text-ink hover:bg-brand-tint" aria-haspopup="dialog">
          התחילו להרכיב מחסן <Icon name="arrow" className="size-4" />
        </motion.button>
        {children}
      </div>
      {mounted && createPortal(sheet, document.body)}
    </>
  );
}
