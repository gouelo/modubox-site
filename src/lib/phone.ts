/** A phone the forms accept: an Israeli number, or (on the English site) one from abroad (+44…). */
export function validPhone(phone: string, locale: string): boolean {
  const p = phone.replace(/[\s().-]/g, "");
  return /^0\d{1,2}\d{7}$/.test(p.replace(/^\+?972/, "0")) || (locale === "en" && /^\+\d{8,15}$/.test(p));
}
