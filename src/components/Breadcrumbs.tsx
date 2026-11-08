import Link from "next/link";
import { site } from "@/lib/catalog";

export interface Crumb {
  name: string;
  /** the page's path ("/shop/"); the last crumb is the page itself */
  path: string;
}

/** BreadcrumbList JSON-LD: full addresses, Hebrew percent-encoded. */
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${site.url}${encodeURI(c.path)}` })),
  };
}

/** The visible trail (the last crumb is the current page, not a link) with its JSON-LD. */
export function Breadcrumbs({ crumbs, label, className = "" }: { crumbs: Crumb[]; label: string; className?: string }) {
  return (
    <nav className={`text-sm text-ink-soft ${className}`} aria-label={label}>
      <ol className="flex flex-wrap items-center">
        {crumbs.map((c, i) => (
          <li key={c.path} className="flex items-center">
            {i > 0 && <span className="mx-2 text-ink/30" aria-hidden="true">/</span>}
            {i < crumbs.length - 1 ? (
              <Link href={c.path} className="hover:text-ink">{c.name}</Link>
            ) : (
              <span aria-current="page">{c.name}</span>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }} />
    </nav>
  );
}
