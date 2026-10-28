"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** true after the first render in the browser (the cart lives in localStorage). */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
