import Link from "next/link";
import { dict, lp, type Locale } from "@/i18n";
import { catalog } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";
import { CookieSettingsLink } from "./CookieConsent";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

export function Footer({ locale }: { locale: Locale }) {
  const { site, categories } = catalog(locale);
  const t = dict(locale);
  const f = t.footer;
  const link = (path: string, label: string) => (
    <li>
      <Link href={lp(locale, path)} className="hover:text-white hover:underline">{label}</Link>
    </li>
  );
  return (
    <footer className="mt-16 bg-ink text-white/80 sm:mt-24">
      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-8 py-10 sm:py-14 lg:grid-cols-4">
        <div className="col-span-2 space-y-4 lg:col-span-1">
          <Logo white alt={t.logoAlt} className="h-8 w-auto" />
          <p className="leading-7 text-white/70">{f.about(site.tagline, site.warrantyYears)}</p>
          <div className="flex gap-2">
            {(
              [
                ["facebook", site.social.facebook, f.social.facebook],
                ["instagram", site.social.instagram, f.social.instagram],
                ["youtube", site.social.youtube, f.social.youtube],
              ] as const
            ).map(([icon, href, label]) => (
              <a key={icon} href={href} target="_blank" rel="noopener" aria-label={label} className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
                <Icon name={icon} className="size-5" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-base font-bold tracking-normal text-white">{f.products}</h2>
          <ul className="space-y-2.5">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={lp(locale, `/shop/#${c.id}`)} className="hover:text-white hover:underline">{c.title}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-base font-bold tracking-normal text-white">{f.info}</h2>
          <ul className="space-y-2.5">
            {link("/about/", f.links.about)}
            {link("/gallery/", f.links.gallery)}
            {link("/warranty/", f.links.warranty)}
            {link("/terms/", f.links.terms)}
            {link("/faq/", f.links.faq)}
            {link("/accessibility/", f.links.accessibility)}
            {link("/privacy/", f.links.privacy)}
            <li><CookieSettingsLink label={f.links.cookies} /></li>
            {/* the blog is in Hebrew only */}
            <li>
              <Link href="/blog/" hrefLang={locale === "he" ? undefined : "he"} className="hover:text-white hover:underline">{f.links.blog}</Link>
            </li>
          </ul>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <h2 className="mb-4 text-base font-bold tracking-normal text-white">{f.talk}</h2>
          <ul className="space-y-3">
            <li>
              <a href={waLink(site.whatsappGreeting)} target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-white">
                <Icon name="whatsapp" className="size-5 text-wa" /> {t.common.whatsapp}
              </a>
            </li>
            <li>
              <a href={`tel:${site.phone}`} className="flex items-center gap-2 hover:text-white">
                <Icon name="phone" className="size-5 text-glow" /> <span dir="ltr">{site.phone}</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="flex items-center gap-2 hover:text-white">
                <Icon name="mail" className="size-5 text-glow" /> {site.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="pin" className="mt-0.5 size-5 shrink-0 text-glow" />
              <span>{f.factory}: {site.factory}<br />{f.factory2}: {site.factory2}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-sm text-white/50 sm:flex-row">
          <p>{f.copyright(new Date().getFullYear(), locale === "he" ? site.legal.name : `${site.legal.nameEn} (${site.legal.companyId})`)}</p>
          <p className="flex items-center gap-2">
            <Icon name="shield" className="size-4" /> {f.secure(site.maxPayments)}
          </p>
        </div>
      </div>
    </footer>
  );
}
