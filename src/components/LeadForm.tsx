"use client";
import { useState } from "react";
import { site } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";

/**
 * Contact form. If data/site.json has a "leadFormEndpoint" (e.g. Formspree, Make, Zapier),
 * the lead is sent there. Otherwise it opens WhatsApp with the details filled in.
 */
export function LeadForm({ product, dark = false }: { product?: string; dark?: boolean }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!/^0\d{1,2}-?\d{7}$/.test(data.phone.replace(/[\s-]/g, "").replace(/^\+?972/, "0"))) {
      setError("נא להזין מספר טלפון תקין");
      return;
    }
    setError("");
    const text = [`פנייה חדשה מהאתר`, `שם: ${data.name}`, `טלפון: ${data.phone}`, data.city && `יישוב: ${data.city}`, product && `מוצר: ${product}`, data.message && `הודעה: ${data.message}`]
      .filter(Boolean)
      .join("\n");
    if (site.leadFormEndpoint) {
      setBusy(true);
      try {
        const res = await fetch(site.leadFormEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ...data, product }) });
        if (!res.ok) throw new Error(String(res.status));
        setSent(true);
      } catch {
        window.open(waLink(text), "_blank", "noopener");
        setSent(true);
      } finally {
        setBusy(false);
      }
    } else {
      window.open(waLink(text), "_blank", "noopener");
      setSent(true);
    }
  }

  if (sent)
    return (
      <div className={`rounded-3xl p-8 text-center ${dark ? "bg-white/10 text-white" : "bg-brand-tint"}`}>
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand text-white"><Icon name="check" className="size-7" /></span>
        <p className="mt-4 text-xl font-extrabold">תודה! קיבלנו את הפרטים</p>
        <p className={`mt-1 ${dark ? "text-white/70" : "text-ink-soft"}`}>נציג של מודובוקס יחזור אליכם בהקדם.</p>
      </div>
    );

  const label = `mb-1.5 block text-sm font-bold ${dark ? "text-white/80" : ""}`;
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <label className="sm:col-span-1">
        <span className={label}>שם מלא *</span>
        <input name="name" required autoComplete="name" className="field" placeholder="ישראל ישראלי" />
      </label>
      <label>
        <span className={label}>טלפון *</span>
        <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" className="field" placeholder="050-0000000" dir="ltr" />
      </label>
      <label className="sm:col-span-2">
        <span className={label}>יישוב</span>
        <input name="city" autoComplete="address-level2" className="field" placeholder="לדוגמה: חיפה" />
      </label>
      <label className="sm:col-span-2">
        <span className={label}>במה נוכל לעזור?</span>
        <textarea name="message" rows={3} className="field resize-none" placeholder="מידה, שימוש מתוכנן, שאלות…" />
      </label>
      {error && <p className="text-sm font-bold text-red-600 sm:col-span-2" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn-brand w-full py-3.5 text-base sm:col-span-2">
        {busy ? "שולח…" : "חזרו אליי"}
      </button>
      <p className={`text-xs sm:col-span-2 ${dark ? "text-white/50" : "text-ink-soft"}`}>הפרטים ישמשו רק כדי לחזור אליכם.</p>
    </form>
  );
}
