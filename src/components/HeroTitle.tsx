"use client";
import { motion } from "framer-motion";

/** The hero headline: each line rises out of a mask, one after the other. */
export function HeroTitle({ lines, accent }: { lines: string[]; accent: string }) {
  const all = [...lines, accent];
  return (
    <h1 className="font-display text-[3.2rem] font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
      {all.map((line, i) => (
        <span key={line} className="block overflow-hidden pb-[0.08em]">
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
