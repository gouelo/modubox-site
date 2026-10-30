"use client";
import { motion } from "framer-motion";

/**
 * The hero headline: each line rises out of a mask, one after the other.
 * `oneLine` sets the lines side by side from lg up.
 */
export function HeroTitle({ lines, accent, oneLine = false, size = "text-[3.2rem] sm:text-7xl lg:text-8xl" }: { lines: string[]; accent: string; oneLine?: boolean; size?: string }) {
  const all = [...lines, accent];
  return (
    <h1 className={`font-display font-extrabold leading-[1.02] tracking-[-0.04em] ${size}`}>
      {all.map((line, i) => (
        <span key={line} className={`block overflow-hidden pb-[0.08em] ${oneLine ? "lg:inline-block lg:whitespace-nowrap lg:me-[0.22em] lg:align-bottom" : ""}`}>
          <motion.span
            className={`block ${i === all.length - 1 ? "text-glow" : ""}`}
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
