"use client";
import { useState } from "react";
import { useLocale, useT } from "@/i18n/client";
import { track } from "@/lib/analytics";
import { sendLead } from "@/lib/attribution";
import { validPhone } from "@/lib/phone";
import { waLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";

/**
 * Contact form: POST /api/lead saves the lead and emails it to the business.
 * If that fails (or on the GitHub Pages copy, which has no server), the
 * customer gets a WhatsApp button with the details filled in.
 */
export function LeadForm({ product, dark = false }: { product?: string; dark?: boolean }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState("");
  const locale = useLocale();
  const t = useT();
  const l = t.lead;
  const w = t.whatsapp.lead;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (data.name.trim().length < 2) {
      setError(l.badName);
      return;
    }
    if (!validPhone(data.phone, locale)) {
      setError(l.badPhone);
      return;
    }
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email.trim())) {
      setError(l.badEmail);
      return;
    }
    setError("");
    setFallback("");
    setBusy(true);
    const result = await sendLead({ ...data, kind: product ? "product" : "contact", locale, product });
    setBusy(false);
    if (result === "ok") {
      // only a lead that reached us counts
      track({ event: "generate_lead", form_name: "contact", ...(product ? { item_name: product } : {}) });
      setSent(true);
      return;
    }
    const text = [w.title, `${w.name}: ${data.name}`, `${w.phone}: ${data.phone}`, data.city && `${w.city}: ${data.city}`, product && `${w.product}: ${product}`, data.message && `${w.message}: ${data.message}`]
      .filter(Boolean)
      .join("\n");
    setError(result === "rate_limited" ? l.rateLimited : l.failed);
    setFallback(waLink(text));
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
    <form onSubmit={onSubmit} className="relative grid gap-4 sm:grid-cols-2" noValidate>
      <label className="sm:col-span-1">
        <span className={label}>{l.name} <span aria-hidden="true">*</span></span>
        <input name="name" required autoComplete="name" className="field" placeholder={l.namePh} />
      </label>
      <label>
        <span className={label}>{l.phone} <span aria-hidden="true">*</span></span>
        <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" className="field" placeholder="050-0000000" dir="ltr" aria-invalid={!!error || undefined} aria-describedby={error ? "lead-error" : undefined} />
      </label>
      <label>
        <span className={label}>{l.email}</span>
        <input name="email" type="email" autoComplete="email" className="field" placeholder="name@example.com" dir="ltr" />
      </label>
      <label>
        <span className={label}>{l.city}</span>
        <input name="city" autoComplete="address-level2" className="field" placeholder={l.cityPh} />
      </label>
      {/* honeypot: hidden from people, filled in by bots */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="sm:col-span-2">
        <span className={label}>{l.message}</span>
        <textarea name="message" rows={3} className="field resize-none" placeholder={l.messagePh} />
      </label>
      {error && <p id="lead-error" className={`text-sm font-bold sm:col-span-2 ${dark ? "text-red-300" : "text-red-700"}`} role="alert">{error}</p>}
      {fallback && (
        <a href={fallback} target="_blank" rel="noopener" className="btn-wa w-full sm:col-span-2">
          <Icon name="whatsapp" /> {l.whatsappInstead}
        </a>
      )}
      <button type="submit" disabled={busy} className="btn-brand w-full py-3.5 text-base sm:col-span-2">
        {busy ? l.sending : l.submit}
      </button>
      <p className={`text-xs sm:col-span-2 ${dark ? "text-white/60" : "text-ink-soft"}`}>{l.privacy}</p>
    </form>
  );
}
