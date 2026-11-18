/**
 * Phone numbers as customers and the team type them: an Israeli number from 0
 * (050-1234567) or with the country code (+972 50-123-4567, 972501234567,
 * 00972…, +972 (0)50…), spaces, dashes, dots and brackets allowed; on the
 * English site, and in the admin, also one from abroad (+44…). Used by the
 * site's forms and the server alike, so it has no server imports.
 */

/** The number without what people put between its digits (and the direction marks a copy from an RTL text brings). */
const strip = (phone: string) => phone.replace(/[\s().\-\u200e\u200f\u202a-\u202e]/g, "");

/** An Israeli number in its local form, digits only (+972 50-123-4567 → 0501234567); null if it isn't one. */
export function israeliPhone(phone: string): string | null {
  let p = strip(phone);
  const intl = /^(?:\+|00)?972/;
  if (intl.test(p)) p = `0${p.replace(intl, "").replace(/^0/, "")}`;
  return /^0\d{8,9}$/.test(p) ? p : null;
}

/** A number from abroad as +digits (+44 20 7946 0958 → +442079460958); null if it isn't one. */
function foreignPhone(phone: string): string | null {
  const p = strip(phone);
  return /^\+\d{8,15}$/.test(p) ? p : null;
}

/** A phone the forms accept: an Israeli number, or (locale "en") one from abroad. */
export function validPhone(phone: string, locale: string): boolean {
  return !!israeliPhone(phone) || (locale === "en" && !!foreignPhone(phone));
}

/** The form an accepted phone is kept in: an Israeli number local with a dash (050-1234567, 02-1234567), one from abroad as +digits. Anything else as typed. */
export function normalizePhone(phone: string): string {
  const il = israeliPhone(phone);
  if (il) return `${il.slice(0, il.length - 7)}-${il.slice(-7)}`;
  return foreignPhone(phone) ?? phone.trim();
}

/** The number in international form, digits only, as wa.me wants it (050-1234567 and +972 50-123-4567 → 972501234567). */
export function waNumber(phone: string): string {
  const il = israeliPhone(phone);
  return il ? `972${il.slice(1)}` : strip(phone).replace(/\D/g, "");
}

/** A tel: link that dials from anywhere ("050-1234567" → "tel:+972501234567"). */
export function telHref(phone: string): string {
  return `tel:+${waNumber(phone)}`;
}
