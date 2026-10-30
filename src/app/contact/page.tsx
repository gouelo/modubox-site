import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LeadForm } from "@/components/LeadForm";
import { site } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "צור קשר", description: `דברו עם מודובוקס: וואטסאפ, טלפון ${site.phone} או השאירו פרטים ונחזור אליכם.` };

export default function ContactPage() {
  const cards = [
    { icon: "whatsapp" as const, title: "וואטסאפ", text: "הדרך הכי מהירה לקבל תשובה", href: waLink(site.whatsappGreeting), cta: "פתיחת צ'אט", cls: "bg-wa text-ink" },
    { icon: "phone" as const, title: "טלפון", text: site.phone, href: `tel:${site.phone}`, cta: "חייגו עכשיו", cls: "bg-ink text-white" },
    { icon: "mail" as const, title: "אימייל", text: site.email, href: `mailto:${site.email}`, cta: "שליחת מייל", cls: "bg-sand text-ink" },
  ];
  return (
    <div className="container-x py-12">
      <header className="max-w-3xl">
        <p className="eyebrow">צור קשר</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">נשמח לעזור לכם לבחור</h1>
        <p className="mt-4 text-lg text-ink-soft">צוות המומחים שלנו יסייע לכם לבחור את המבנה המתאים ביותר. השאירו פרטים ונחזור אליכם.</p>
      </header>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <a key={c.title} href={c.href} target={c.icon === "whatsapp" ? "_blank" : undefined} rel="noopener" className={`group flex flex-col gap-3 rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-lift ${c.cls}`}>
            <Icon name={c.icon} className="size-8" />
            <span className="text-xl font-black">{c.title}</span>
            <span className="opacity-80" dir={c.icon === "phone" ? "ltr" : undefined}>{c.text}</span>
            <span className="mt-auto font-bold underline-offset-4 group-hover:underline">{c.cta} ←</span>
          </a>
        ))}
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div className="card p-6 sm:p-8">
          <h2 className="mb-6 text-2xl font-extrabold">השאירו פרטים</h2>
          <LeadForm />
        </div>
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&hl=iw&z=14&output=embed`}
              title={`מפה: מודובוקס, ${site.factory}`}
              className="block h-72 w-full border-0 sm:h-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="p-6">
              <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold"><Icon name="pin" className="size-5 shrink-0 text-brand-dark" /> איפה אנחנו</h2>
              <p>מפעל ראשי ותצוגה: <strong>{site.factory}</strong></p>
              <p>מפעל משני: <strong>{site.factory2}</strong></p>
              <p className="mt-2 text-sm text-ink-soft">ביקור בתצוגה – בתיאום מראש. {site.hours.startsWith("TODO") ? "" : site.hours}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`https://waze.com/ul?q=${encodeURIComponent(site.mapQuery)}&navigate=yes`} target="_blank" rel="noopener" className="btn-ghost">ניווט עם Waze</a>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapQuery)}`} target="_blank" rel="noopener" className="btn-ghost">פתיחה ב־Google Maps</a>
              </div>
            </div>
          </div>
          <Link href="/faq/" className="btn-ghost w-full">לשאלות הנפוצות ←</Link>
        </div>
      </div>
    </div>
  );
}
