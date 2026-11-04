"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { lp } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { CONSENT_KEY, OPEN_SETTINGS, readConsent, saveConsent } from "@/lib/consent";

// the saved choice, read from localStorage (null on the server and before a choice)
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => e.key === CONSENT_KEY && fn();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
};
const snapshot = () => localStorage.getItem(CONSENT_KEY);

/**
 * The cookie banner: small, at the bottom, until the visitor accepts, rejects
 * or saves settings (Consent Mode v2: src/lib/consent.ts). The footer's
 * "cookie settings" link opens the settings again.
 */
export function CookieConsent() {
  const t = useT().cookies;
  const locale = useLocale();
  const saved = useSyncExternalStore(subscribe, snapshot, () => "server");
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  const openSettings = () => {
    const c = readConsent();
    setAnalytics(c?.analytics ?? false);
    setAds(c?.ads ?? false);
    opener.current = document.activeElement;
    setSettings(true);
  };

  useEffect(() => {
    window.addEventListener(OPEN_SETTINGS, openSettings);
    return () => window.removeEventListener(OPEN_SETTINGS, openSettings);
  }, []);

  useEffect(() => {
    if (!settings) return;
    dialog.current?.querySelector<HTMLElement>("input,button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settings]);

  function close() {
    setSettings(false);
    (opener.current as HTMLElement | null)?.focus?.();
  }

  const choose = (choice: { analytics: boolean; ads: boolean }) => {
    saveConsent(choice);
    listeners.forEach((fn) => fn());
    close();
  };

  const privacy = (
    <Link href={lp(locale, "/privacy/")} className="font-bold underline underline-offset-2">
      {t.more}
    </Link>
  );

  return (
    <>
      {saved === null && !settings && (
        <section aria-label={t.label} className="fixed inset-x-2 bottom-2 z-[70] mx-auto max-w-xl rounded-2xl bg-white p-4 text-ink shadow-lift ring-1 ring-line sm:inset-x-auto sm:start-5 sm:bottom-5 sm:max-w-md">
          <p className="text-sm leading-6">
            {t.text} {privacy}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose({ analytics: true, ads: true })} className="btn-primary px-5 py-2 text-sm">{t.accept}</button>
            <button type="button" onClick={() => choose({ analytics: false, ads: false })} className="btn-ghost px-5 py-2 text-sm">{t.reject}</button>
            <button type="button" onClick={openSettings} className="px-3 py-2 text-sm font-bold underline underline-offset-2">{t.settings}</button>
          </div>
        </section>
      )}
      {settings && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-ink/40 p-2 sm:place-items-center" onClick={(e) => e.target === e.currentTarget && close()}>
          <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="cookie-title" className="w-full max-w-md rounded-2xl bg-white p-5 text-ink shadow-lift">
            <div className="flex items-start justify-between gap-4">
              <h2 id="cookie-title" className="text-lg font-extrabold">{t.title}</h2>
              <button type="button" onClick={close} className="text-sm font-bold underline">{t.close}</button>
            </div>
            <ul className="mt-4 space-y-4">
              <li className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold">{t.necessary.title}</p>
                  <p className="text-sm text-ink-soft">{t.necessary.text}</p>
                </div>
                <span className="shrink-0 text-xs font-bold text-ink-soft">{t.necessary.always}</span>
              </li>
              {(
                [
                  ["analytics", t.analytics, analytics, setAnalytics],
                  ["ads", t.ads, ads, setAds],
                ] as const
              ).map(([id, c, on, set]) => (
                <li key={id}>
                  <label className="flex cursor-pointer items-start justify-between gap-4">
                    <span>
                      <span className="block font-bold">{c.title}</span>
                      <span className="block text-sm text-ink-soft">{c.text}</span>
                    </span>
                    <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} className="mt-1 size-5 shrink-0 accent-ink" />
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm">{privacy}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => choose({ analytics, ads })} className="btn-primary px-5 py-2 text-sm">{t.save}</button>
              <button type="button" onClick={() => choose({ analytics: true, ads: true })} className="btn-ghost px-5 py-2 text-sm">{t.accept}</button>
              <button type="button" onClick={() => choose({ analytics: false, ads: false })} className="btn-ghost px-5 py-2 text-sm">{t.reject}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** "Cookie settings" in the footer. */
export function CookieSettingsLink({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS))} className="hover:text-white hover:underline">
      {label}
    </button>
  );
}
