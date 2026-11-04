/**
 * Cookie consent and Google Consent Mode v2. Until the visitor chooses,
 * ad_storage, ad_user_data, ad_personalization and analytics_storage are
 * "denied" (set before GTM loads: src/components/Analytics.tsx). The choice is
 * kept in localStorage and sent to Google as a consent update.
 */
export interface Consent {
  analytics: boolean;
  ads: boolean;
  /** when it was chosen (ISO) */
  at: string;
  v: 1;
}

export const CONSENT_KEY = "modubox-consent";
/** the footer's "cookie settings" link opens the settings with this event */
export const OPEN_SETTINGS = "modubox:cookie-settings";

export function consentState(c: Pick<Consent, "analytics" | "ads"> | null) {
  const g = (on: boolean | undefined) => (on ? "granted" : "denied");
  return {
    ad_storage: g(c?.ads),
    ad_user_data: g(c?.ads),
    ad_personalization: g(c?.ads),
    analytics_storage: g(c?.analytics),
  };
}

/** The inline script that runs before GTM: the defaults, then a saved choice. */
export function consentDefaultsScript(): string {
  const denied = JSON.stringify({ ...consentState(null), functionality_storage: "granted", security_storage: "granted", wait_for_update: 500 });
  return [
    "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}",
    `gtag('consent','default',${denied});`,
    "gtag('set','ads_data_redaction',true);",
    `try{var c=JSON.parse(localStorage.getItem('${CONSENT_KEY}')||'null');if(c&&c.v===1){var g=function(b){return b?'granted':'denied'};gtag('consent','update',{ad_storage:g(c.ads),ad_user_data:g(c.ads),ad_personalization:g(c.ads),analytics_storage:g(c.analytics)});}}catch(e){}`,
  ].join("");
}

export function readConsent(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null") as Consent | null;
    return c && c.v === 1 ? c : null;
  } catch {
    return null;
  }
}

type Gtag = (...args: unknown[]) => void;

export function saveConsent(choice: Pick<Consent, "analytics" | "ads">) {
  const c: Consent = { ...choice, at: new Date().toISOString(), v: 1 };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(c));
  } catch {
    /* private mode: asked again next visit */
  }
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
  w.dataLayer = w.dataLayer ?? [];
  // gtag's own shape (an arguments object), as Consent Mode requires
  const gtag: Gtag =
    w.gtag ??
    function () {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
  gtag("consent", "update", consentState(c));
  w.dataLayer.push({ event: "cookie_consent_update", consent_analytics: c.analytics, consent_ads: c.ads });
  return c;
}
