import Link from "next/link";
import { categories, site } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 bg-ink text-white/80">
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo white className="h-8 w-auto" />
          <p className="leading-7 text-white/70">{site.tagline}. פיתוח וייצור ישראלי, {site.warrantyYears} שנות אחריות והתקנה עד הבית.</p>
          <div className="flex gap-2">
            {(
              [
                ["facebook", site.social.facebook, "פייסבוק"],
                ["instagram", site.social.instagram, "אינסטגרם"],
                ["youtube", site.social.youtube, "יוטיוב"],
              ] as const
            ).map(([icon, href, label]) => (
              <a key={icon} href={href} target="_blank" rel="noopener" aria-label={label} className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
                <Icon name={icon} className="size-5" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-4 font-bold text-white">המוצרים שלנו</h3>
          <ul className="space-y-2.5">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/shop/#${c.id}`} className="hover:text-white">{c.title}</Link>
              </li>
            ))}
            <li><Link href="/shop/#addons" className="hover:text-white">תוספות למחסן</Link></li>
            <li><Link href="/configurator/" className="hover:text-white">קונפיגורטור 3D</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-bold text-white">מידע</h3>
          <ul className="space-y-2.5">
            <li><Link href="/about/" className="hover:text-white">אודות מודובוקס</Link></li>
            <li><Link href="/gallery/" className="hover:text-white">גלריה וסרטונים</Link></li>
            <li><Link href="/warranty/" className="hover:text-white">אחריות ושירות</Link></li>
            <li><Link href="/terms/" className="hover:text-white">תקנון האתר</Link></li>
            <li><Link href="/#faq" className="hover:text-white">שאלות נפוצות</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-bold text-white">דברו איתנו</h3>
          <ul className="space-y-3">
            <li>
              <a href={waLink(site.whatsappGreeting)} target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-white">
                <Icon name="whatsapp" className="size-5 text-wa" /> וואטסאפ
              </a>
            </li>
            <li>
              <a href={`tel:${site.phone}`} className="flex items-center gap-2 hover:text-white">
                <Icon name="phone" className="size-5 text-brand" /> <span dir="ltr">{site.phone}</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="flex items-center gap-2 hover:text-white">
                <Icon name="mail" className="size-5 text-brand" /> {site.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="pin" className="mt-0.5 size-5 shrink-0 text-brand" />
              <span>מפעל: {site.factory}<br />מפעל משני: {site.factory2}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-sm text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Modubox מודובוקס. כל הזכויות שמורות.</p>
          <p className="flex items-center gap-2">
            <Icon name="shield" className="size-4" /> תשלום מאובטח · עד {site.maxPayments} תשלומים
          </p>
        </div>
      </div>
    </footer>
  );
}
