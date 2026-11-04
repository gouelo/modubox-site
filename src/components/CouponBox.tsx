"use client";
import { useId, useState } from "react";
import { useLocale, useT } from "@/i18n/client";
import { useCart } from "@/lib/cart-store";
import { formatILS } from "@/lib/format";
import { checkCoupon, type CouponCheck } from "@/lib/use-coupon";
import { Icon } from "./Icon";

/** The coupon field: the server checks the code; a valid one is kept with the cart. */
export function CouponBox({ check }: { check: CouponCheck | "checking" | null }) {
  const locale = useLocale();
  const t = useT().cart.coupon;
  const id = useId();
  const { items, coupon, setCoupon } = useCart();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CouponCheck | null>(null);

  const message = (c: CouponCheck) =>
    c.status === "ok" ? "" : c.error === "unknown" ? t.unknown : c.error === "expired" ? t.expired : c.error === "min_order" ? t.minOrder(formatILS(c.min ?? 0, locale)) : t.unavailable;

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    const c = await checkCoupon(code, items, locale);
    setBusy(false);
    if (c.status === "ok") {
      setCoupon(c.code);
      setCode("");
      setError(null);
    } else setError(c);
  };

  if (coupon)
    return (
      <div className="rounded-2xl bg-brand-tint/60 p-3 text-sm" role="status">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-bold text-brand-dark">
            <Icon name="check" className="size-4" /> {t.applied(coupon)}
          </span>
          <button type="button" onClick={() => setCoupon(undefined)} className="font-semibold text-ink-soft underline">{t.remove}</button>
        </div>
        {check === "checking" && <p className="mt-1 text-ink-soft">{t.checking}</p>}
        {check && check !== "checking" && check.status === "error" && <p className="mt-1 font-semibold text-red-700">{message(check)}</p>}
      </div>
    );

  return (
    <form onSubmit={apply} noValidate>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">{t.label}</label>
      <div className="flex gap-2">
        <input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t.placeholder}
          autoComplete="off"
          autoCapitalize="characters"
          dir="ltr"
          className={`field min-w-0 flex-1 text-start uppercase placeholder:normal-case ${error ? "border-red-600" : ""}`}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button type="submit" disabled={busy || !code.trim()} className="btn-ghost shrink-0 px-5">{busy ? t.checking : t.apply}</button>
      </div>
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm font-semibold text-red-700" role="alert">{message(error)}</p>}
    </form>
  );
}
