import type { Metadata } from "next";
import { Faq, FaqPhoto } from "@/components/Faq";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { dict, type Locale } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { catalog } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";

export const faqMeta = (locale: Locale): Metadata => pageMeta(locale, "/faq/", dict(locale).meta.faq);

/** Round 8: questions in groups, each beside a photo (shown whole), and photos in the answers that need one. */
export function FaqPage({ locale }: { locale: Locale }) {
  const { faq, faqGroups } = catalog(locale);
  const t = dict(locale);
  const p = t.faqPage;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="container-x max-w-6xl py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="eyebrow">{p.eyebrow}</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-6xl">{p.title}</h1>
        <p className="mt-4 text-lg leading-8 text-ink-soft">{p.text}</p>
      </header>
      <nav className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={p.topics}>
        {faqGroups.map((g, i) => (
          <a key={g.id} href={`#${g.id}`} className="flex shrink-0 items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold transition hover:border-ink hover:bg-ink hover:text-white">
            <span className="text-copper-deep">{String(i + 1).padStart(2, "0")}</span> {g.title}
          </a>
        ))}
      </nav>

      {faqGroups.map((g, i) => (
        <section key={g.id} id={g.id} className="mt-14 scroll-mt-24 grid gap-6 sm:mt-20 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-12">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="font-display text-5xl font-extrabold leading-none text-copper-deep">{String(i + 1).padStart(2, "0")}</p>
            <h2 className="mt-2 text-3xl font-extrabold">{g.title}</h2>
            {g.image && <FaqPhoto image={g.image} sizes="(min-width:1024px) 22rem, 100vw" className="mt-5 max-w-md lg:max-w-none" />}
          </Reveal>
          <Reveal delay={0.08}>
            <Faq items={g.items} locale={locale} />
          </Reveal>
        </section>
      ))}

      <div className="mt-16 flex flex-col items-start gap-4 rounded-[2rem] bg-sand p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-2xl font-extrabold">{p.notFound}</h2>
          <p className="mt-1 text-ink-soft">{p.write}</p>
        </div>
        <a href={waLink(t.whatsapp.faq)} target="_blank" rel="noopener" className="btn-wa px-7 py-4 text-base">
          <Icon name="whatsapp" /> {p.ask}
        </a>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
