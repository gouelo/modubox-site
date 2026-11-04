"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CouponBox } from "@/components/CouponBox";
import { Icon } from "@/components/Icon";
import { lp } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { CURRENCY, ecommerce, gaItems, savePending, track } from "@/lib/analytics";
import { useCart } from "@/lib/cart-store";
import { catalog } from "@/lib/catalog";
import { checkoutRequest, MAX_INSTALLMENTS } from "@/lib/checkout";
import { formatILS } from "@/lib/format";
import { summarizeCart } from "@/lib/pricing";
import { asset } from "@/lib/paths";
import { useCoupon } from "@/lib/use-coupon";
import { useHydrated } from "@/lib/use-hydrated";
import { orderMessage, waLink, type Customer } from "@/lib/whatsapp";
import { couponDiscount, Totals } from "./CartView";

function Steps({ step }: { step: number }) {
  const t = useT().checkout;
  const steps = t.steps;
  return (
    <ol className="mb-8 flex items-center gap-2" aria-label={t.progress}>
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
          <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-black transition ${i < step ? "bg-brand-dark text-white" : i === step ? "bg-ink text-white" : "bg-sand text-ink/70"}`} aria-hidden="true">
            {i < step ? <Icon name="check" className="size-4" /> : i + 1}
          </span>
          <span className={`text-sm font-bold ${i === step ? "" : "text-ink/70"}`}>{s}</span>
          {i < steps.length - 1 && <span className={`h-0.5 flex-1 rounded ${i < step ? "bg-brand" : "bg-line"}`} aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

/** e.g. 261028-4821: the date and a random 4-digit suffix */
function newOrderId() {
  return new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
}

/** The checkout page. */
export function CheckoutPage() {
  return (
    <div className="container-x max-w-5xl py-10">
      <CheckoutFlow />
    </div>
  );
}

export function CheckoutFlow() {
  const hydrated = useHydrated();
  const { items, clear } = useCart();
  const locale = useLocale();
  const t = useT();
  const k = t.checkout;
  const site = catalog(locale).site;
  const ils = (n: number) => formatILS(n, locale);
  const cart = summarizeCart(items, locale);
  const couponCheck = useCoupon(items, locale);
  const discount = couponDiscount(couponCheck);
  const toPay = cart.total - (discount?.amount ?? 0);
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<Customer>({ name: "", phone: "", email: "", city: "", address: "", notes: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ id: string; message: string } | null>(null);
  const [installments, setInstallments] = useState(1);
  // online payment (Z-Credit) is on when the server says so; on GitHub Pages there is no server
  const [payment, setPayment] = useState<"checking" | "online" | "offline">("checking");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  // begin_checkout: once per visit to the checkout, when the saved cart is loaded
  const began = useRef(false);
  useEffect(() => {
    if (!hydrated || began.current || cart.lines.length === 0) return;
    began.current = true;
    track({ event: "begin_checkout", ecommerce: ecommerce(cart) });
  }, [hydrated, cart]);

  useEffect(() => {
    if (step !== 2 || payment !== "checking") return;
    let live = true;
    fetch(asset("/api/checkout/"), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { enabled?: boolean } | null) => live && setPayment(j?.enabled ? "online" : "offline"))
      .catch(() => live && setPayment("offline"));
    return () => {
      live = false;
    };
  }, [step, payment]);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-3xl bg-sand" />;

  if (done)
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl rounded-3xl bg-sand p-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand text-white" aria-hidden="true"><Icon name="check" className="size-8" /></span>
        <h1 className="mt-4 text-3xl font-extrabold">{k.done}</h1>
        <p className="mt-2 text-ink-soft">
          {k.orderNo} <strong className="text-ink">#{done.id}</strong>. {k.doneText}
        </p>
        <a href={waLink(done.message)} target="_blank" rel="noopener" className="btn-wa mt-6 w-full py-4 text-base"><Icon name="whatsapp" /> {k.sendWhatsapp}</a>
        <Link href={lp(locale, "/")} className="btn-ghost mt-3 w-full">{k.home}</Link>
      </motion.div>
    );

  if (cart.lines.length === 0)
    return (
      <div className="rounded-3xl bg-sand p-10 text-center">
        <h1 className="text-xl font-extrabold">{t.cart.empty}</h1>
        <Link href={lp(locale, "/shop/")} className="btn-primary mt-5">{t.common.toCatalog}</Link>
      </div>
    );

  const set = (k: keyof Customer) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCustomer((c) => ({ ...c, [k]: e.target.value }));
  const validate = () => {
    const e: Record<string, string> = {};
    const phone = customer.phone.replace(/[\s()-]/g, "");
    // an Israeli number; on the English site also a number from abroad (+44…)
    const phoneOk = /^0\d{1,2}\d{7}$/.test(phone.replace(/^\+?972/, "0")) || (locale === "en" && /^\+\d{8,15}$/.test(phone));
    if (customer.name.trim().length < 2) e.name = k.errors.name;
    if (!phoneOk) e.phone = k.errors.phone;
    if (customer.email && !/^\S+@\S+\.\S+$/.test(customer.email)) e.email = k.errors.email;
    if (!customer.city.trim()) e.city = k.errors.city;
    if (!customer.address.trim()) e.address = k.errors.address;
    setErrors(e);
    // the first field with an error takes the focus, so its message is read out
    const first = Object.keys(e)[0];
    if (first) requestAnimationFrame(() => document.getElementById(`co-${first}`)?.focus());
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    const id = newOrderId();
    // an order without online payment: a lead for the business (no customer details here)
    track({ event: "generate_lead", form_name: "order", currency: CURRENCY, value: toPay });
    const message = orderMessage(cart, customer, id, locale);
    if (site.leadFormEndpoint) {
      try {
        await fetch(site.leadFormEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "order", id, customer, message }) });
      } catch {
        /* the WhatsApp button on the next screen is the fallback */
      }
    }
    clear();
    setDone({ id, message });
    window.scrollTo({ top: 0 });
  };

  /** Prices the cart again on the server and goes to Z-Credit's payment page. */
  const pay = async () => {
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch(asset("/api/checkout/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutRequest(items, customer, installments, locale, discount?.code)),
      });
      const j = (await res.json().catch(() => ({}))) as { url?: string; orderId?: string; receipt?: { session: string; total: number; sig: string }; error?: string; coupon?: { error: string } };
      if (res.ok && j.url) {
        // for the purchase event on the success page, once the server confirms the payment
        if (j.orderId && j.receipt) savePending({ order: j.orderId, ...j.receipt, coupon: discount?.code, items: gaItems(cart) });
        window.location.assign(j.url);
        return;
      }
      if (j.error === "not_configured") setPayment("offline");
      else if (j.error === "invalid_coupon") setPayError(j.coupon?.error === "expired" ? t.cart.coupon.expired : t.cart.coupon.unknown);
      else setPayError(j.error === "price_on_request" ? k.onRequest : k.payFailed);
    } catch {
      setPayError(k.payFailed);
    }
    setPaying(false);
  };

  const field = (f: keyof Customer, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <input
        id={`co-${f}`}
        value={customer[f] ?? ""}
        onChange={set(f)}
        className={`field ${errors[f] ? "border-red-600" : ""}`}
        aria-invalid={!!errors[f] || undefined}
        aria-describedby={errors[f] ? `co-${f}-error` : undefined}
        {...props}
      />
      {errors[f] && (
        <span id={`co-${f}-error`} className="mt-1 block text-sm font-semibold text-red-700">
          {errors[f]}
        </span>
      )}
    </label>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <h1 className="mb-6 text-3xl font-extrabold">{k.title}</h1>
        <Steps step={step} />
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: locale === "he" ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: locale === "he" ? 20 : -20 }} transition={{ duration: 0.25 }}>
            {step === 0 && (
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (validate()) setStep(1);
                }}
                noValidate
              >
                {field("name", k.fields.name, { autoComplete: "name", required: true })}
                {field("phone", k.fields.phone, { type: "tel", inputMode: "tel", autoComplete: "tel", dir: "ltr", required: true })}
                <div className="sm:col-span-2">{field("email", k.fields.email, { type: "email", autoComplete: "email", dir: "ltr" })}</div>
                {field("city", k.fields.city, { autoComplete: "address-level2", required: true })}
                {field("address", k.fields.address, { autoComplete: "street-address", required: true })}
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-bold">{k.fields.notes}</span>
                  <textarea value={customer.notes} onChange={set("notes")} rows={3} className="field resize-none" placeholder={k.fields.notesPh} />
                </label>
                <button type="submit" className="btn-primary w-full py-4 text-base sm:col-span-2">{k.toSummary}</button>
              </form>
            )}
            {step === 1 && (
              <div className="space-y-5">
                <div className="card divide-y divide-line">
                  {cart.lines.map((l) => (
                    <div key={l.item.id} className="p-4">
                      <div className="flex justify-between gap-3 font-bold"><span>{l.product.name}{l.item.qty > 1 ? ` ×${l.item.qty}` : ""}</span><span>{ils(l.itemsTotal)}</span></div>
                      {l.quote.lines.slice(1).map((x) => <p key={x.id} className="text-sm text-ink-soft">+ {x.label}{x.qty > 1 ? ` ×${x.qty}` : ""}</p>)}
                      {l.item.design && <p className="text-sm text-ink-soft">{k.designed}{l.item.design.exact ? "" : k.designedTodo}</p>}
                      <p className="mt-1 text-sm text-ink-soft"><span aria-hidden="true">🚚 </span>{l.fulfillment.label}: {l.fulfillment.price === null ? t.common.onRequest : l.fulfillment.price === 0 ? t.common.noCost : ils(l.fulfillment.price * l.item.qty)}</p>
                    </div>
                  ))}
                </div>
                <div className="card p-4 text-[15px]">
                  <h2 className="font-bold">{k.installDetails}</h2>
                  <p className="text-ink-soft">{customer.name} · <span dir="ltr">{customer.phone}</span></p>
                  <p className="text-ink-soft">{customer.address}, {customer.city}</p>
                  <button type="button" onClick={() => setStep(0)} className="mt-1 text-sm font-semibold text-brand-dark underline">{k.edit}</button>
                </div>
                <label className="flex items-start gap-3 rounded-2xl bg-sand p-4">
                  <input type="checkbox" className="mt-1 size-5 accent-ink" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span className="text-[15px]">
                    {k.agree.before}
                    <Link href={lp(locale, "/terms/")} target="_blank" className="font-bold underline">{k.agree.terms}</Link>
                    {k.agree.and}
                    <Link href={lp(locale, "/warranty/")} target="_blank" className="font-bold underline">{k.agree.warranty}</Link>
                    {k.agree.after}
                  </span>
                </label>
                <p className="text-sm text-ink-soft">
                  {k.privacy.before}
                  <Link href={lp(locale, "/privacy/")} target="_blank" className="font-bold underline">{k.privacy.link}</Link>
                  {k.privacy.after}
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(0)} className="btn-ghost">{t.common.back}</button>
                  <button type="button" disabled={!agree} onClick={() => setStep(2)} className="btn-primary flex-1 py-4 text-base">{k.toPayment}</button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5">
                <div className="rounded-3xl bg-brand-tint/50 p-6 ring-1 ring-brand/20">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-white text-brand-dark shadow-soft" aria-hidden="true"><Icon name="card" className="size-6" /></span>
                    <div>
                      <h2 className="text-lg font-extrabold">{k.card}</h2>
                      <p className="text-sm text-ink-soft">{k.cards(MAX_INSTALLMENTS)}</p>
                      <p className="text-sm text-ink-soft">{k.wallets}</p>
                    </div>
                  </div>
                  {payment === "checking" && <p className="mt-5 h-24 animate-pulse rounded-2xl bg-white/70 p-4 text-sm text-ink-soft">{k.checking}</p>}
                  {payment === "online" && !cart.hasOnRequest && (
                    <div className="mt-5 space-y-3">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-bold">{k.installments}</span>
                        <select id="co-installments" value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className="field">
                          {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{k.installmentsOption(n, ils(Math.round(toPay / n)))}</option>
                          ))}
                        </select>
                      </label>
                      <p className="flex items-start gap-2 text-sm text-ink-soft"><Icon name="shield" className="mt-0.5 size-4 shrink-0" /> {k.secureNote}</p>
                    </div>
                  )}
                  {payment === "online" && cart.hasOnRequest && <p className="mt-5 rounded-2xl bg-white p-4 text-sm font-semibold text-brand-dark" role="status">{k.onRequest}</p>}
                  {payment === "offline" && <p className="mt-5 rounded-2xl bg-white p-4 text-sm text-ink-soft" role="status">{k.unavailable}</p>}
                  <p className="mt-3 text-sm text-ink-soft">{k.invoiceNote}</p>
                </div>
                {payError && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{payError}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-ghost">{t.common.back}</button>
                  {payment === "online" && !cart.hasOnRequest ? (
                    <button type="button" onClick={pay} disabled={paying || couponCheck === "checking"} aria-busy={paying || undefined} className="btn-brand flex-1 py-4 text-base">{paying ? k.paying : k.pay(ils(toPay))}</button>
                  ) : (
                    <button type="button" onClick={placeOrder} disabled={payment === "checking"} className="btn-brand flex-1 py-4 text-base">{k.confirm(ils(toPay))}</button>
                  )}
                </div>
                <a href={waLink(orderMessage(cart, customer, undefined, locale))} target="_blank" rel="noopener" className="btn-wa w-full"><Icon name="whatsapp" /> {k.orWhatsapp}</a>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="mb-4 text-lg font-extrabold">{k.yourOrder(cart.count)}</h2>
          <Totals cart={cart} discount={discount} />
          <div className="mt-4">
            <CouponBox check={couponCheck} />
          </div>
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-soft"><Icon name="shield" className="size-4" /> {k.protected}</p>
      </aside>
    </div>
  );
}
