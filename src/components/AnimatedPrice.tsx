"use client";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { formatILS } from "@/lib/format";

/** A price that rolls to its new value, with a "+1,190 ₪" chip that floats off on each change. */
export function AnimatedPrice({ value, className = "", showDelta = true }: { value: number; className?: string; showDelta?: boolean }) {
  const spring = useSpring(value, { stiffness: 140, damping: 22, mass: 0.6 });
  const text = useTransform(spring, (v) => formatILS(Math.round(v)));
  const [prev, setPrev] = useState(value);
  const [delta, setDelta] = useState<{ n: number; amount: number } | null>(null);
  if (prev !== value) {
    setDelta((d) => ({ n: (d?.n ?? 0) + 1, amount: value - prev }));
    setPrev(value);
  }

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <span className={`relative inline-flex tabular-nums ${className}`}>
      <motion.span>{text}</motion.span>
      {showDelta && (
        <AnimatePresence>
          {delta && (
            <motion.span
              key={delta.n}
              initial={{ opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: [0, 1, 1, 0], y: -26, scale: 1 }}
              transition={{ duration: 1.3, times: [0, 0.15, 0.7, 1], ease: "easeOut" }}
              className={`pointer-events-none absolute -top-1 end-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${delta.amount >= 0 ? "bg-brand text-white" : "bg-ink/80 text-white"}`}
              aria-hidden="true"
            >
              {delta.amount >= 0 ? "+" : "−"}
              {formatILS(Math.abs(delta.amount))}
            </motion.span>
          )}
        </AnimatePresence>
      )}
    </span>
  );
}
