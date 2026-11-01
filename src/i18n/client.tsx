"use client";
import { MotionConfig } from "framer-motion";
import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import { dict } from "./index";

const LocaleContext = createContext<Locale>("he");

/** Gives client components the page's language (set once per root layout). */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <LocaleContext.Provider value={locale}>
      {/* framer-motion follows the visitor's "reduce motion" setting */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** The page language's strings, in a client component. */
export function useT() {
  return dict(useLocale());
}
