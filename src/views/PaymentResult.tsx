"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/Icon";
import { lp } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { CURRENCY, markPurchaseSent, purchaseSent, readPending, track } from "@/lib/analytics";
import { useCart } from "@/lib/cart-store";
import { asset } from "@/lib/paths";
import { useHydrated } from "@/lib/use-hydrated";
import { waLink } from "@/lib/whatsapp";

/**
 * Where Z-Credit sends the customer back: /checkout/success/?order=… after a
 * payment, /checkout/failed/?order=…&reason=cancel when they cancel. The page
 * only says so: the order counts as paid when the callback has confirmed it
 * with Z-Credit (src/app/api/checkout/callback).
 */
export function PaymentResult({ result }: { result: "success" | "failed" }) {
  const locale = useLocale();
  const t = useT().payment;
  const clear = useCart((s) => s.clear);
  const hydrated = useHydrated();
  // the query is only known in the browser (the page itself is static)
  const q = new URLSearchParams(hydrated ? window.location.search : "");
  // order numbers are digits only (src/lib/checkout.ts → newOrderId)
  const order = (q.get("order") ?? "").replace(/\D/g, "").slice(0, 20);
  const cancelled = q.get("reason") === "cancel";

  useEffect(() => {
    if (result === "success") clear();
  }, [result, clear]);

  // purchase: only once the server has confirmed with Z-Credit that this order
  // was paid, and once per order (src/lib/analytics.ts)
  useEffect(() => {
    if (result !== "success" || !order || purchaseSent(order)) return;
    const pending = readPending(order);
    if (!pending) return;
    let live = true;
    (async () => {
      // the callback may still be on its way: ask a few times
      for (let i = 0; i < 4 && live; i++) {
        try {
          const res = await fetch(asset("/api/checkout/status/"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order, session: pending.session, total: pending.total, sig: pending.sig }),
          });
          const j = (await res.json().catch(() => ({}))) as { paid?: boolean };
          if (j.paid) {
            if (!live || purchaseSent(order)) return;
            markPurchaseSent(order);
            track({
              event: "purchase",
              ecommerce: { transaction_id: order, currency: CURRENCY, value: pending.total, ...(pending.coupon ? { coupon: pending.coupon } : {}), items: pending.items },
            });
            return;
          }
          if (res.status === 400) return;
        } catch {
          /* try again */
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    })();
    return () => {
      live = false;
    };
  }, [result, order]);

  const ok = result === "success";
  const title = ok ? t.successTitle : cancelled ? t.cancelledTitle : t.failedTitle;

  return (
    <div className="container-x max-w-5xl py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl rounded-3xl bg-sand p-8 text-center">
        <span className={`mx-auto grid size-16 place-items-center rounded-full text-white ${ok ? "bg-brand" : "bg-ink"}`} aria-hidden="true">
          <Icon name={ok ? "check" : "card"} className="size-8" />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold">{title}</h1>
        {order && (
          <p className="mt-2 text-ink-soft">
            {t.orderNo} <strong className="text-ink" dir="ltr">#{order}</strong>
          </p>
        )}
        <p className="mt-2 text-ink-soft">{ok ? t.successText : t.failedText}</p>
        {!ok && <Link href={lp(locale, "/checkout/")} className="btn-brand mt-6 w-full py-4 text-base">{t.retry}</Link>}
        <a href={waLink(ok ? t.waPaid(order) : t.waFailed(order))} target="_blank" rel="noopener" className={`btn-wa w-full ${ok ? "mt-6 py-4 text-base" : "mt-3"}`}>
          <Icon name="whatsapp" /> {t.whatsapp}
        </a>
        <Link href={lp(locale, "/")} className="btn-ghost mt-3 w-full">{t.home}</Link>
      </motion.div>
    </div>
  );
}
