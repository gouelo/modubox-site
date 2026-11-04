import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSeoForm } from "@/components/admin/ContentForms";
import { PageTitle } from "@/components/admin/ui";
import { site } from "@/lib/catalog";
import { requireAdmin } from "@/lib/admin/session";
import { uploadsEnabled } from "@/lib/admin/uploads";
import { normalizePath } from "@/lib/seo/meta";
import { findSitePage, renderedDescription, renderedTitle } from "@/lib/seo/pages";
import { readSeo } from "@/lib/seo/store";

export const metadata = { title: "עריכת דף" };

/** One page's SEO editor. */
export default async function EditPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  await requireAdmin("content");
  const path = normalizePath((await searchParams).path ?? "");
  const page = await findSitePage(path);
  if (!page) notFound();
  const seo = await readSeo();
  const meta = await page.meta();
  const s = seo.pages.get(path);
  // the FAQ page has its own questions (data/faq.json): no second FAQ block there
  const hasFaq = !/^(\/en)?\/faq\/$/.test(path);
  const url = `${site.url}${encodeURI(path)}`;
  return (
    <>
      <PageTitle
        title={page.label}
        sub={
          <a href={encodeURI(path)} target="_blank" rel="noopener" className="hover:underline" dir="ltr">
            {path} ↗
          </a>
        }
        action={
          <Link href={`/admin/content/health/?path=${encodeURIComponent(path)}`} className="btn-ghost min-h-11 px-4 text-sm">
            בדיקת הדף
          </Link>
        }
      />
      <div className="card p-4 sm:p-5">
        <PageSeoForm
          path={path}
          url={url}
          kind={page.kind}
          defaults={{ title: renderedTitle(meta, page.locale), description: renderedDescription(meta, page.locale) }}
          value={{ title: s?.title ?? "", description: s?.description ?? "", ogImage: s?.ogImage ?? "", canonical: s?.canonical ?? "", noindex: s?.noindex ?? false, keyFacts: s?.keyFacts ?? [] }}
          faqs={hasFaq ? (seo.faqs.get(path) ?? []).map((f) => ({ q: f.q, a: f.a })) : null}
          uploads={uploadsEnabled()}
        />
      </div>
    </>
  );
}
