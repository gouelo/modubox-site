import type { Locale } from "@/i18n";
import { business, orgJsonLd } from "@/lib/seo/settings";
import { loadSeo } from "@/lib/seo/store";

/** The business as search engines read it (data/site.json with the admin's Content → business), whole: on the home and contact pages only. */
export async function BusinessJsonLd({ locale }: { locale: Locale }) {
  const jsonLd = orgJsonLd(business((await loadSeo()).business, locale), locale);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
