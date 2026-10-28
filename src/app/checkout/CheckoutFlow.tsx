"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useCart } from "@/lib/cart-store";
import { site } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { summarizeCart } from "@/lib/pricing";
import { useHydrated } from "@/lib/use-hydrated";
import { orderMessage, waLink, type Customer } from "@/lib/whatsapp";
import { Totals } from "../cart/CartView";

const STEPS = ["פרטים", "סיכום", "תשלום"];

function Steps({ step }: { step: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-black transition ${i < step ? "bg-brand text-white" : i === step ? "bg-ink text-white" : "bg-sand text-ink/40"}`}>
            {i < step ? <Icon name="check" className="size-4" /> : i + 1}
          </span>
          <span className={`text-sm font-bold ${i === step ? "" : "text-ink/50"}`}>{s}</span>
          {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 rounded ${i < step ? "bg-brand" : "bg-line"}`} />}
        </li>
      ))}
    </ol>
  );
}

/** e.g. 261028-4821: the date and a random 4-digit suffix */
function newOrderId() {
  return new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
}

export function CheckoutFlow() {
  const hydrated = useHydrated();
  const { items, clear } = useCart();
  const cart = summarizeCart(items);
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<Customer>({ name: "", phone: "", email: "", city: "", address: "", notes: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ id: string; message: string } | null>(null);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-3xl bg-sand" />;

  if (done)
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl rounded-3xl bg-sand p-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand text-white"><Icon name="check" className="size-8" /></span>
        <h1 className="mt-4 text-3xl font-black">ההזמנה נקלטה!</h1>
        <p className="mt-2 text-ink-soft">מספר הזמנה <strong className="text-ink">#{done.id}</strong>. נציג של מודובוקס יחזור אליכם לתיאום ההתקנה ולהשלמת התשלום.</p>
        <a href={waLink(done.message)} target="_blank" rel="noopener" className="btn-wa mt-6 w-full py-4 text-base"><Icon name="whatsapp" /> שליחת ההזמנה בוואטסאפ לאישור מהיר</a>
        <Link href="/" className="btn-ghost mt-3 w-full">חזרה לדף הבית</Link>
      </motion.div>
    );

  if (cart.lines.length === 0)
    return (
      <div className="rounded-3xl bg-sand p-10 text-center">
        <p className="text-xl font-extrabold">הסל ריק</p>
        <Link href="/shop/" className="btn-primary mt-5">לקטלוג</Link>
      </div>
    );

  const set = (k: keyof Customer) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCustomer((c) => ({ ...c, [k]: e.target.value }));
  const validate = () => {
    const e: Record<string, string> = {};
    if (customer.name.trim().length < 2) e.name = "נא להזין שם מלא";
    if (!/^0\d{1,2}\d{7}$/.test(customer.phone.replace(/[\s-]/g, "").replace(/^\+?972/, "0"))) e.phone = "נא להזין טלפון תקין";
    if (customer.email && !/^\S+@\S+\.\S+$/.test(customer.email)) e.email = "כתובת אימייל לא תקינה";
    if (!customer.city.trim()) e.city = "נא להזין יישוב";
    if (!customer.address.trim()) e.address = "נא להזין כתובת להתקנה";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    const id = newOrderId();
    const message = orderMessage(cart, customer, id);
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

  const field = (k: keyof Customer, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <input value={customer[k] ?? ""} onChange={set(k)} className={`field ${errors[k] ? "border-red-500" : ""}`} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <span className="mt-1 block text-sm font-semibold text-red-600">{errors[k]}</span>}
    </label>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <h1 className="mb-6 text-3xl font-black tracking-tight">השלמת הזמנה</h1>
        <Steps step={step} />
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            {step === 0 && (
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (validate()) setStep(1);
                }}
                noValidate
              >
                {field("name", "שם מלא *", { autoComplete: "name" })}
                {field("phone", "טלפון *", { type: "tel", inputMode: "tel", autoComplete: "tel", dir: "ltr" })}
                <div className="sm:col-span-2">{field("email", "אימייל (לקבלת חשבונית)", { type: "email", autoComplete: "email", dir: "ltr" })}</div>
                {field("city", "יישוב *", { autoComplete: "address-level2" })}
                {field("address", "רחוב ומספר *", { autoComplete: "street-address" })}
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-bold">הערות להתקנה</span>
                  <textarea value={customer.notes} onChange={set("notes")} rows={3} className="field resize-none" placeholder="קומה, גישה למקום, צד הדלת המבוקש…" />
                </label>
                <button type="submit" className="btn-primary w-full py-4 text-base sm:col-span-2">המשך לסיכום</button>
              </form>
            )}
            {step === 1 && (
              <div className="space-y-5">
                <div className="card divide-y divide-line">
                  {cart.lines.map((l) => (
                    <div key={l.item.id} className="p-4">
                      <div className="flex justify-between gap-3 font-bold"><span>{l.product.name}{l.item.qty > 1 ? ` ×${l.item.qty}` : ""}</span><span>{formatILS(l.itemsTotal)}</span></div>
                      {l.quote.lines.slice(1).map((x) => <p key={x.id} className="text-sm text-ink-soft">+ {x.label}{x.qty > 1 ? ` ×${x.qty}` : ""}</p>)}
                      <p className="mt-1 text-sm text-ink-soft">🚚 {l.fulfillment.label}: {l.fulfillment.price === null ? "בתיאום" : l.fulfillment.price === 0 ? "ללא עלות" : formatILS(l.fulfillment.price * l.item.qty)}</p>
                    </div>
                  ))}
                </div>
                <div className="card p-4 text-[15px]">
                  <p className="font-bold">פרטי ההתקנה</p>
                  <p className="text-ink-soft">{customer.name} · <span dir="ltr">{customer.phone}</span></p>
                  <p className="text-ink-soft">{customer.address}, {customer.city}</p>
                  <button type="button" onClick={() => setStep(0)} className="mt-1 text-sm font-semibold text-brand-dark underline">עריכה</button>
                </div>
                <label className="flex items-start gap-3 rounded-2xl bg-sand p-4">
                  <input type="checkbox" className="mt-1 size-5 accent-ink" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span className="text-[15px]">קראתי ואני מסכים/ה ל<Link href="/terms/" target="_blank" className="font-bold underline">תקנון</Link> ול<Link href="/warranty/" target="_blank" className="font-bold underline">תנאי האחריות</Link>, ומאשר/ת שהמשטח להתקנה ישר, מפולס וקשיח.</span>
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(0)} className="btn-ghost">חזרה</button>
                  <button type="button" disabled={!agree} onClick={() => setStep(2)} className="btn-primary flex-1 py-4 text-base">המשך לתשלום</button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5">
                {/* PAYMENT PROVIDER PLACEHOLDER – see README: "חיבור סליקה" */}
                <div className="rounded-3xl border-2 border-dashed border-brand/50 bg-brand-tint/50 p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-white text-brand-dark shadow-soft"><Icon name="card" className="size-6" /></span>
                    <div>
                      <p className="text-lg font-extrabold">תשלום מאובטח בכרטיס אשראי</p>
                      <p className="text-sm text-ink-soft">עד {site.maxPayments} תשלומים · Visa · Mastercard · ישראכרט</p>
                    </div>
                  </div>
                  <div className="mt-5 grid h-44 place-items-center rounded-2xl bg-white text-center text-ink-soft ring-1 ring-line">
                    <p className="px-6 text-sm">
                      כאן יופיע טופס הסליקה המאובטח
                      <br />
                      <span className="text-xs">(בקרוב: Cardcom / Tranzila / Grow)</span>
                    </p>
                  </div>
                </div>
                <p className="text-sm text-ink-soft">עד לחיבור הסליקה באתר: לחיצה על "אישור הזמנה" שולחת אלינו את ההזמנה, ונציג יחזור אליכם להשלמת התשלום בטלפון – מאובטח ומהיר.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-ghost">חזרה</button>
                  <button type="button" onClick={placeOrder} className="btn-brand flex-1 py-4 text-base">אישור הזמנה · {formatILS(cart.total)}</button>
                </div>
                <a href={waLink(orderMessage(cart, customer))} target="_blank" rel="noopener" className="btn-wa w-full"><Icon name="whatsapp" /> או: שליחת ההזמנה בוואטסאפ</a>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="mb-4 text-lg font-extrabold">ההזמנה שלכם ({cart.count})</h2>
          <Totals cart={cart} />
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-soft"><Icon name="shield" className="size-4" /> הפרטים שלכם מוגנים</p>
      </aside>
    </div>
  );
}
