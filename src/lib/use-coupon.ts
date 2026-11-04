"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { useCart } from "./cart-store";
import { cartRequest } from "./checkout";
import type { CouponError } from "./coupons";
import { asset } from "./paths";
import type { CartItem } from "./types";

/**
 * Coupon codes are checked by the server only (POST /api/coupon/): the codes
 * are in an env var, never in the browser. This is a preview; the payment
 * route checks the code again and charges its own total.
 */
export type CouponCheck =
  | { status: "ok"; code: string; discount: number }
  /** unavailable: no server (GitHub Pages) or the check failed */
  | { status: "error"; error: CouponError | "unavailable"; min?: number };

export async function checkCoupon(code: string, items: CartItem[], locale: Locale): Promise<CouponCheck> {
  try {
    const res = await fetch(asset("/api/coupon/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cartRequest(items, locale, code)),
    });
    const j = (await res.json().catch(() => ({}))) as { code?: string; discount?: number; coupon?: { error: CouponError; min?: number } };
    if (res.ok && j.code && typeof j.discount === "number") return { status: "ok", code: j.code, discount: j.discount };
    if (j.coupon) return { status: "error", error: j.coupon.error, min: j.coupon.min };
  } catch {
    /* no server: unavailable */
  }
  return { status: "error", error: "unavailable" };
}

/** The saved coupon, checked again against the cart as it changes. null: no coupon; "checking" while it's asked. */
export function useCoupon(items: CartItem[], locale: Locale): CouponCheck | "checking" | null {
  const coupon = useCart((s) => s.coupon);
  const key = coupon ? JSON.stringify([coupon, locale, items.map((i) => [i.slug, i.qty, i.selections, i.fulfillment, i.design?.link])]) : "";
  const [result, setResult] = useState<{ key: string; check: CouponCheck } | null>(null);

  useEffect(() => {
    if (!coupon) return;
    let live = true;
    checkCoupon(coupon, items, locale).then((check) => live && setResult({ key, check }));
    return () => {
      live = false;
    };
    // key stands for coupon, items and locale
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!coupon) return null;
  return result?.key === key ? result.check : "checking";
}
