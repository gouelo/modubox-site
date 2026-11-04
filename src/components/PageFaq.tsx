import { Faq } from "@/components/Faq";
import { dict, type Locale } from "@/i18n";
import { normalizePath } from "@/lib/seo/meta";
import { loadSeo } from "@/lib/seo/store";

/**
 * Questions and answers the admin added to a page (Content → page → FAQ), at
 * its end, with FAQPage JSON-LD for search engines and AI answers. Nothing
 * when the page has none.
 */
export async function PageFaq({ path, locale, className = "container-x max-w-4xl mt-16 sm:mt-24" }: { path: string; locale: Locale; className?: string }) {
  const items = (await loadSeo()).faqs.get(normalizePath(path)) ?? [];
  if (items.length === 0) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <section className={className} aria-labelledby="page-faq">
      <h2 id="page-faq" className="mb-5 text-2xl font-extrabold sm:text-3xl">{dict(locale).faqPage.title}</h2>
      <Faq items={items.map((f) => ({ q: f.q, a: f.a }))} locale={locale} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}
