"use client";
import { useState } from "react";
import { useLocale, useT } from "@/i18n/client";
import { track } from "@/lib/analytics";
import { catalog } from "@/lib/catalog";
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
  const locale = useLocale();
  const t = useT();
  const l = t.lead;
  const w = t.whatsapp.lead;
  const site = catalog(locale).site;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const phone = data.phone.replace(/[\s()-]/g, "");
    // an Israeli number; on the English site also a number from abroad (+44…)
    const ok = /^0\d{1,2}\d{7}$/.test(phone.replace(/^\+?972/, "0")) || (locale === "en" && /^\+\d{8,15}$/.test(phone));
    if (!ok) {
      setError(l.badPhone);
      return;
    }
    setError("");
    track({ event: "generate_lead", form_name: "contact", ...(product ? { item_name: product } : {}) });
    const text = [w.title, `${w.name}: ${data.name}`, `${w.phone}: ${data.phone}`, data.city && `${w.city}: ${data.city}`, product && `${w.product}: ${product}`, data.message && `${w.message}: ${data.message}`]
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
      <div role="status" className={`rounded-3xl p-8 text-center ${dark ? "bg-white/10 text-white" : "bg-brand-tint"}`}>
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand text-white"><Icon name="check" className="size-7" /></span>
        <p className="mt-4 text-xl font-extrabold">{l.thanks}</p>
        <p className={`mt-1 ${dark ? "text-white/70" : "text-ink-soft"}`}>{l.soon}</p>
      </div>
    );

  const label = `mb-1.5 block text-sm font-bold ${dark ? "text-white/80" : ""}`;
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <label className="sm:col-span-1">
        <span className={label}>{l.name} <span aria-hidden="true">*</span></span>
        <input name="name" required autoComplete="name" className="field" placeholder={l.namePh} />
      </label>
      <label>
        <span className={label}>{l.phone} <span aria-hidden="true">*</span></span>
        <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" className="field" placeholder="050-0000000" dir="ltr" aria-invalid={!!error || undefined} aria-describedby={error ? "lead-error" : undefined} />
      </label>
      <label className="sm:col-span-2">
        <span className={label}>{l.city}</span>
        <input name="city" autoComplete="address-level2" className="field" placeholder={l.cityPh} />
      </label>
      <label className="sm:col-span-2">
        <span className={label}>{l.message}</span>
        <textarea name="message" rows={3} className="field resize-none" placeholder={l.messagePh} />
      </label>
      {error && <p id="lead-error" className={`text-sm font-bold sm:col-span-2 ${dark ? "text-red-300" : "text-red-700"}`} role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn-brand w-full py-3.5 text-base sm:col-span-2">
        {busy ? l.sending : l.submit}
      </button>
      <p className={`text-xs sm:col-span-2 ${dark ? "text-white/60" : "text-ink-soft"}`}>{l.privacy}</p>
    </form>
  );
}
