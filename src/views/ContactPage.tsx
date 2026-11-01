import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LeadForm } from "@/components/LeadForm";
import { Stars } from "@/components/Stars";
import { dict, lp, type Locale } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { catalog } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";

export function contactMeta(locale: Locale): Metadata {
  const m = dict(locale).meta.contact;
  return pageMeta(locale, "/contact/", { title: m.title, description: m.description(catalog(locale).site.phone) });
}

export function ContactPage({ locale }: { locale: Locale }) {
  const { site } = catalog(locale);
  const t = dict(locale);
  const c = t.contact;
  const arrow = locale === "he" ? "←" : "→";
  const cards = [
    { icon: "whatsapp" as const, title: t.common.whatsapp, text: c.whatsappText, href: waLink(site.whatsappGreeting), cta: c.whatsappCta, cls: "bg-wa text-ink" },
    { icon: "phone" as const, title: c.phone, text: site.phone, href: `tel:${site.phone}`, cta: c.phoneCta, cls: "bg-ink text-white" },
    { icon: "mail" as const, title: c.email, text: site.email, href: `mailto:${site.email}`, cta: c.emailCta, cls: "bg-sand text-ink" },
  ];
  return (
    <div className="container-x py-12">
      <header className="max-w-3xl">
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{c.title}</h1>
        <p className="mt-4 text-lg text-ink-soft">{c.text}</p>
      </header>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {cards.map((k) => (
          <a key={k.title} href={k.href} target={k.icon === "whatsapp" ? "_blank" : undefined} rel="noopener" className={`group flex flex-col gap-3 rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-lift ${k.cls}`}>
            <Icon name={k.icon} className="size-8" />
            <span className="text-xl font-black">{k.title}</span>
            <span className="opacity-80" dir={k.icon === "phone" ? "ltr" : undefined}>{k.text}</span>
            <span className="mt-auto font-bold underline-offset-4 group-hover:underline">
              {k.cta} <span aria-hidden="true">{arrow}</span>
            </span>
          </a>
        ))}
      </div>
      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-2">
        <div className="card p-6 sm:p-8">
          <h2 className="mb-6 text-2xl font-extrabold">{c.form}</h2>
          <LeadForm />
        </div>
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <iframe
              src={`https://maps.google.com/maps?q=${site.mapCoords}&hl=${c.mapLang}&z=15&output=embed`}
              title={c.mapTitle(site.factory)}
              className="block h-72 w-full border-0 sm:h-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="p-6">
              <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold"><Icon name="pin" className="size-5 shrink-0 text-brand-dark" aria-hidden="true" /> {c.where}</h2>
              <p>
                {c.main}: <strong>{site.factory}</strong>
              </p>
              <p>
                {c.second}: <strong>{site.factory2}</strong>
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                {c.visit} {site.hours.startsWith("TODO") ? "" : site.hours}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`https://waze.com/ul?ll=${site.mapCoords}&navigate=yes`} target="_blank" rel="noopener" className="btn-ghost">{c.waze}</a>
                <a href={`https://www.google.com/maps/search/?api=1&query=${site.mapCoords}`} target="_blank" rel="noopener" className="btn-ghost">{c.maps}</a>
              </div>
            </div>
          </div>
          {/* Modubox's own Google listing (not the Ein Harod one the map pins) */}
          <a href={site.googleReviewsUrl} target="_blank" rel="noopener" className="card group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift sm:p-6">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sand">
              <Icon name="google" className="size-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink-soft">{c.google}</span>
              <span className="mt-0.5 flex items-center gap-2">
                <span className="text-3xl font-black leading-none">{site.rating}</span>
                <Stars locale={locale} value={5} className="size-5" />
              </span>
              <span className="mt-1 block text-sm text-ink-soft">{c.reviews(site.reviewCount)}</span>
            </span>
            <span className="shrink-0 font-bold text-brand-dark underline-offset-4 group-hover:underline">{c.toReviews}</span>
          </a>
          <Link href={lp(locale, "/faq/")} className="btn-ghost w-full">
            {c.toFaq}
          </Link>
        </div>
      </div>
    </div>
  );
}
