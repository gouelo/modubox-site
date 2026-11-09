"use client";

import { useActionState, useMemo, useState } from "react";
import { addonsFor, catalog, getProduct, plain } from "@/lib/catalog";
import { defaultSelections, fulfillmentOptions, hasVariantQty, summarizeCart, variantKey } from "@/lib/pricing";
import type { CartItem, FulfillmentId, Selections } from "@/lib/types";
import { createManualOrderAction } from "@/lib/admin/manual-order-actions";
import { Feedback, Field } from "./ContentForms";
import { SubmitButton } from "./SubmitButton";

/**
 * A phone or WhatsApp sale: products and add-ons priced live with the site's
 * own pricing (the server prices it again when it is saved), the customer,
 * and how they pay.
 */

interface Line {
  key: number;
  slug: string;
  qty: number;
  selections: Selections;
  fulfillment: FulfillmentId;
}

const ils = (n: number) => `${n.toLocaleString("he-IL")} ₪`;
const newLine = (slug: string, key: number): Line => {
  const p = getProduct(slug)!;
  return { key, slug, qty: 1, selections: defaultSelections(p), fulfillment: fulfillmentOptions(p)[0].id };
};

export function ManualOrderForm({ payLink }: { payLink: boolean }) {
  const products = catalog("he").products;
  const [lines, setLines] = useState<Line[]>(() => [newLine(products[0].slug, 1)]);
  const [payment, setPayment] = useState("transfer");
  const [discount, setDiscount] = useState("");
  const [state, act] = useActionState(createManualOrderAction, {});
  const cart = useMemo(() => summarizeCart(lines.map((l): CartItem => ({ id: String(l.key), slug: l.slug, qty: l.qty, selections: l.selections, fulfillment: l.fulfillment }))), [lines]);
  const set = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const setSel = (key: number, id: string, v: number | string) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, selections: { ...l.selections, [id]: v } } : l)));
  const off = Number(discount) || 0;

  return (
    <form action={act} className="grid gap-5">
      <input type="hidden" name="items" value={JSON.stringify(lines.map(({ key: _k, ...l }) => l))} />
      {lines.map((l, i) => {
        const p = getProduct(l.slug)!;
        const line = cart.lines.find((x) => x.item.id === String(l.key));
        return (
          <section key={l.key} className="card grid min-w-0 gap-4 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold">מוצר {i + 1}</h2>
              {lines.length > 1 ? (
                <button type="button" className="text-sm font-semibold text-rose-700 underline" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                  הסרה
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-[1fr_5rem] gap-3">
              <Field label="מוצר">
                <select value={l.slug} onChange={(e) => set(l.key, newLine(e.target.value, l.key))} className="field">
                  {products.map((x) => (
                    <option key={x.slug} value={x.slug}>
                      {plain(x.name)} · {ils(x.price)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="כמות">
                <input type="number" min={1} max={10} value={l.qty} onChange={(e) => set(l.key, { qty: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })} className="field" dir="ltr" />
              </Field>
            </div>
            {addonsFor(p).length ? (
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-bold">תוספות</legend>
                {addonsFor(p).map((a) =>
                  a.kind === "toggle" ? (
                    <label key={a.id} className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={Number(l.selections[a.id]) === 1} onChange={(e) => setSel(l.key, a.id, e.target.checked ? 1 : 0)} className="size-5 accent-brand-dark" />
                      <span className="flex-1">{plain(a.name)}</span>
                      <span className="text-ink-soft">{a.price === null || a.price === undefined ? "בתיאום" : ils(a.price)}</span>
                    </label>
                  ) : a.kind === "qty" ? (
                    <label key={a.id} className="flex items-center gap-3 text-sm">
                      <input type="number" min={0} max={a.maxQty ?? 10} value={Number(l.selections[a.id] ?? 0)} onChange={(e) => setSel(l.key, a.id, Math.min(a.maxQty ?? 10, Math.max(0, Number(e.target.value) || 0)))} className="field w-20" dir="ltr" aria-label={plain(a.name)} />
                      <span className="flex-1">{plain(a.name)}</span>
                      <span className="text-ink-soft">{a.price === null || a.price === undefined ? "בתיאום" : `${ils(a.price)} ליח׳`}</span>
                    </label>
                  ) : hasVariantQty(a) ? (
                    // a quantity for each option (two glass walls, one with a shutter): priced again on the server
                    <fieldset key={a.id} className="grid gap-1.5 text-sm">
                      <legend className="mb-0.5">{plain(a.name)}</legend>
                      {a.choices
                        ?.filter((c) => c.id !== a.default)
                        .map((c) => (
                          <label key={c.id} className="flex items-center gap-3">
                            <input
                              type="number"
                              min={0}
                              max={a.maxQty ?? 10}
                              value={Number(l.selections[variantKey(a, c.id)] ?? 0)}
                              onChange={(e) => setSel(l.key, variantKey(a, c.id), Math.min(a.maxQty ?? 10, Math.max(0, Number(e.target.value) || 0)))}
                              className="field w-20"
                              dir="ltr"
                              aria-label={`${plain(a.name)}: ${plain(c.label)}`}
                            />
                            <span className="flex-1">{plain(c.label)}</span>
                            <span className="text-ink-soft">{c.price === null ? "בתיאום" : `${ils(c.price)} ליח׳`}</span>
                          </label>
                        ))}
                    </fieldset>
                  ) : (
                    <label key={a.id} className="grid gap-1 text-sm">
                      <span>{plain(a.name)}</span>
                      <select value={String(l.selections[a.id] ?? a.default ?? "")} onChange={(e) => setSel(l.key, a.id, e.target.value)} className="field">
                        {a.choices?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {plain(c.label)}
                            {c.id !== a.default ? (c.price === null ? " · בתיאום" : c.price ? ` · ${ils(c.price)}` : "") : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                )}
              </fieldset>
            ) : null}
            <Field label="אספקה">
              <select value={l.fulfillment} onChange={(e) => set(l.key, { fulfillment: e.target.value as FulfillmentId })} className="field">
                {fulfillmentOptions(p).map((o) => (
                  <option key={o.id} value={o.id}>
                    {plain(o.label)} · {o.price === null ? "בתיאום" : o.price === 0 ? "ללא עלות" : ils(o.price)}
                    {o.payToInstaller ? " (למתקין)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            {line ? (
              <p className="text-sm font-bold">
                {ils(line.itemsTotal)}
                {line.fulfillmentTotal ? ` + אספקה ${ils(line.fulfillmentTotal)}` : ""}
                {line.payLater ? ` + למתקין ${ils(line.payLater)}` : ""}
                {line.quote.onRequest.length ? <span className="block font-semibold text-rose-700">יש כאן תוספת שמחירה בתיאום: אי אפשר לשמור אותה בהזמנה.</span> : null}
              </p>
            ) : null}
          </section>
        );
      })}
      <button type="button" className="btn-ghost min-h-11 w-fit px-4 text-sm" onClick={() => setLines((ls) => [...ls, newLine(products[0].slug, Math.max(...ls.map((x) => x.key)) + 1)])}>
        + מוצר נוסף
      </button>

      <section className="card grid gap-4 p-4 sm:grid-cols-2">
        <h2 className="text-base font-extrabold sm:col-span-2">הלקוח</h2>
        <Field label="שם מלא">
          <input name="name" required className="field" autoComplete="off" />
        </Field>
        <Field label="טלפון">
          <input name="phone" required className="field" dir="ltr" inputMode="tel" autoComplete="off" />
        </Field>
        <Field label="מייל (לא חובה)">
          <input name="email" type="email" className="field" dir="ltr" autoComplete="off" />
        </Field>
        <Field label="יישוב">
          <input name="city" className="field" autoComplete="off" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="כתובת">
            <input name="address" className="field" autoComplete="off" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="הערות">
            <textarea name="notes" className="field min-h-20" />
          </Field>
        </div>
      </section>

      <section className="card grid gap-4 p-4 sm:grid-cols-2">
        <h2 className="text-base font-extrabold sm:col-span-2">מכירה ותשלום</h2>
        <Field label="ההזמנה התקבלה">
          <select name="source" defaultValue="phone" className="field">
            <option value="phone">בטלפון</option>
            <option value="whatsapp">בוואטסאפ</option>
            <option value="other">אחר</option>
          </select>
        </Field>
        <Field label="אמצעי תשלום">
          <select name="payment" value={payment} onChange={(e) => setPayment(e.target.value)} className="field">
            <option value="transfer">העברה בנקאית</option>
            <option value="cash">מזומן</option>
            <option value="check">צ׳ק</option>
            {payLink ? <option value="zcredit_link">קישור תשלום Z-Credit (נשלח ללקוח)</option> : null}
            <option value="other">אחר</option>
          </select>
        </Field>
        <Field label="קוד קופון (לא חובה)" hint="נבדק בשמירה, כמו בקופה באתר.">
          <input name="coupon" className="field uppercase" dir="ltr" />
        </Field>
        <Field label="הנחה נוספת (₪)" hint="סיכום מיוחד בטלפון. ריק = בלי.">
          <input name="discount" type="number" min={0} step={1} value={discount} onChange={(e) => setDiscount(e.target.value)} className="field" dir="ltr" />
        </Field>
        {payment === "zcredit_link" ? (
          <Field label="עד כמה תשלומים הלקוח יכול לבחור" hint="הלקוח בוחר בדף התשלום של Z-Credit, מתשלום אחד ועד המספר הזה (תשלומים שווים, בלי קרדיט).">
            <select name="maxInstallments" defaultValue="12" className="field">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "תשלום אחד בלבד" : `עד ${n} תשלומים`}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" name="paid" className="size-5 accent-brand-dark" />
            <b>כבר שולם</b> (אפשר לסמן גם אחר כך, בדף ההזמנה)
          </label>
        )}
      </section>

      <div className="card p-4 text-[15px]">
        <div className="flex justify-between">
          <span>מוצרים ותוספות</span>
          <span>{ils(cart.itemsTotal)}</span>
        </div>
        {cart.fulfillmentTotal ? (
          <div className="flex justify-between">
            <span>אספקה והתקנה</span>
            <span>{ils(cart.fulfillmentTotal)}</span>
          </div>
        ) : null}
        {off ? (
          <div className="flex justify-between text-emerald-700">
            <span>הנחה</span>
            <span>−{ils(off)}</span>
          </div>
        ) : null}
        <div className="mt-2 flex justify-between border-t border-line pt-2 text-lg font-extrabold">
          <span>לתשלום</span>
          <span>{ils(Math.max(0, cart.total - off))}</span>
        </div>
        {cart.payLater ? <p className="mt-1 text-sm text-ink-soft">ועוד {ils(cart.payLater)} למתקין ביום ההתקנה.</p> : null}
        <p className="mt-1 text-xs text-ink-soft">קופון, אם יש, יורד בשמירה.</p>
      </div>

      <div>
        <SubmitButton className="btn-brand min-h-12 w-full justify-center text-base">{payment === "zcredit_link" ? "שמירה ויצירת קישור תשלום" : "שמירת ההזמנה"}</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}
