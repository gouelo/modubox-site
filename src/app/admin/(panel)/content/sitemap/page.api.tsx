import sitemap from "@/app/sitemap";
import { PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";
import { site } from "@/lib/catalog";

export const metadata = { title: "Sitemap" };

/** Every address in /sitemap.xml, as search engines get it. */
export default async function SitemapPage() {
  await requireAdmin("content");
  const entries = await sitemap();
  return (
    <>
      <PageTitle
        title="Sitemap"
        sub={
          <>
            {entries.length} כתובות. דפים שסומנו noindex לא נכללים. <a href="/sitemap.xml" target="_blank" rel="noopener" className="underline">sitemap.xml ↗</a>
          </>
        }
      />
      <ul className="card divide-y divide-line text-sm">
        {entries.map((e) => (
          <li key={e.url} className="flex items-center gap-3 px-4 py-2.5">
            <a href={e.url.replace(site.url, "")} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate hover:underline" dir="ltr">
              {decodeURI(e.url.replace(site.url, ""))}
            </a>
            <span className="text-xs text-ink-soft" dir="ltr">
              {e.priority}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
