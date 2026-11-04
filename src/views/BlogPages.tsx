import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { dict } from "@/i18n";
import { notFound } from "next/navigation";
import { coverUrl, findPost, hebrewDate, imageSize, listPosts, readingMinutes, type PostMeta } from "@/lib/blog";
import { catalog, site } from "@/lib/catalog";
import { Markdown } from "@/lib/markdown";
import { waLink } from "@/lib/whatsapp";

/** The blog (Hebrew only): a quiet index at /blog/ and a page per post, for search and AI readers more than for the menu. */

const t = () => dict("he").blog;
const url = (path: string) => `${site.url}${path}`;
const postPath = (slug: string) => `/blog/${slug}/`;

export function blogIndexMeta(): Metadata {
  const b = t();
  return {
    title: b.title,
    description: b.description,
    alternates: { canonical: "/blog/", types: {} },
    openGraph: { type: "website", url: "/blog/", title: b.title, description: b.description, locale: "he_IL" },
  };
}

export async function postMeta(slug: string): Promise<Metadata> {
  const p = await findPost(slug);
  if (!p) return {};
  const image = p.cover ? coverUrl(p.cover, site.url) : undefined;
  return {
    title: p.seoTitle,
    description: p.description,
    alternates: { canonical: postPath(p.slug) },
    openGraph: {
      type: "article",
      url: postPath(p.slug),
      title: p.seoTitle,
      description: p.description,
      locale: "he_IL",
      publishedTime: p.date,
      modifiedTime: p.updated,
      ...(image ? { images: [{ url: image, alt: p.coverAlt ?? p.title }] } : {}),
    },
  };
}

export const postParams = async () => (await listPosts()).map((p) => ({ slug: p.slug }));

function PostCard({ p, small = false }: { p: PostMeta; small?: boolean }) {
  return (
    <article className="group relative flex flex-col">
      {p.cover && (
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-sand">
          <Image src={p.cover} alt="" fill sizes={small ? "(min-width:1024px) 22vw, (min-width:640px) 45vw, 90vw" : "(min-width:1024px) 30vw, (min-width:640px) 45vw, 100vw"} className="object-cover transition duration-700 group-hover:scale-[1.03]" />
        </div>
      )}
      <p className="mt-3 text-xs text-ink-soft"><time dateTime={p.date}>{hebrewDate(p.date)}</time></p>
      <h3 className={`mt-1 font-extrabold leading-snug ${small ? "text-base" : "text-lg"}`}>
        <Link href={postPath(p.slug)} className="after:absolute after:inset-0 hover:underline">{p.title}</Link>
      </h3>
      {!small && <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-soft">{p.description}</p>}
    </article>
  );
}

export async function BlogIndex() {
  const b = t();
  const posts = await listPosts();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: b.title,
    description: b.description,
    url: url("/blog/"),
    inLanguage: "he",
    publisher: { "@type": "Organization", name: dict("he").meta.siteName, url: site.url },
    blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: url(postPath(p.slug)), datePublished: p.date, dateModified: p.updated })),
  };
  return (
    <div className="container-x max-w-6xl py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="eyebrow">{b.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">{b.title}</h1>
        <p className="mt-3 text-lg leading-8 text-ink-soft">{b.intro}</p>
      </header>
      <h2 className="sr-only">{b.allPosts}</h2>
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <PostCard key={p.slug} p={p} />
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}

export async function BlogPost({ slug }: { slug: string }) {
  const b = t();
  const p = await findPost(slug);
  if (!p) notFound();
  const s = catalog("he").site;
  const more = (await listPosts()).filter((x) => x.slug !== p.slug).slice(0, 3);
  const minutes = readingMinutes(p.body);
  const org = { "@type": "Organization", name: dict("he").meta.siteName, url: site.url };
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      dateModified: p.updated,
      inLanguage: "he",
      mainEntityOfPage: url(postPath(p.slug)),
      url: url(postPath(p.slug)),
      ...(p.cover ? { image: coverUrl(p.cover, site.url) } : {}),
      author: org,
      publisher: { ...org, logo: { "@type": "ImageObject", url: url("/brand/apple-touch-icon.png") } },
      articleSection: p.categories,
      wordCount: p.body.split(/\s+/).length,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: b.home, item: url("/") },
        { "@type": "ListItem", position: 2, name: b.title, item: url("/blog/") },
        { "@type": "ListItem", position: 3, name: p.title, item: url(postPath(p.slug)) },
      ],
    },
  ];
  return (
    <div className="container-x max-w-3xl py-10 sm:py-14">
      <nav className="text-sm text-ink-soft" aria-label={b.breadcrumb}>
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:underline">{b.home}</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/blog/" className="hover:underline">{b.title}</Link></li>
        </ol>
      </nav>
      <article className="mt-4">
        <header>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">{p.title}</h1>
          <p className="mt-3 text-sm text-ink-soft">
            <time dateTime={p.date}>{hebrewDate(p.date)}</time> · {b.minutes(minutes)}
          </p>
        </header>
        {p.cover && (
          <figure className="mt-6 overflow-hidden rounded-2xl bg-sand">
            <Image src={p.cover} alt={p.coverAlt ?? ""} width={imageSize(p.cover)?.[0] ?? 1600} height={imageSize(p.cover)?.[1] ?? 1000} priority sizes="(min-width:768px) 720px, 100vw" className="h-auto w-full" />
          </figure>
        )}
        <div className="mt-8">
          <Markdown source={p.body} locale="he" imageSize={imageSize} />
        </div>
      </article>

      <aside className="mt-12 rounded-3xl bg-sand p-6 sm:p-8">
        <p className="text-xl font-extrabold">{b.ctaTitle}</p>
        <p className="mt-1 text-ink-soft">{b.ctaText}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/shop/" className="btn-primary">{b.ctaShop}</Link>
          <a href={waLink(s.whatsappGreeting)} target="_blank" rel="noopener" className="btn-wa"><Icon name="whatsapp" /> {dict("he").common.whatsapp}</a>
        </div>
      </aside>

      {more.length > 0 && (
        <section className="mt-14" aria-labelledby="more-posts">
          <h2 id="more-posts" className="text-xl font-extrabold">{b.more}</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            {more.map((x) => (
              <PostCard key={x.slug} p={x} small />
            ))}
          </div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}

/** A small "from the blog" strip: three recent posts, text only. */
export async function BlogStrip() {
  const b = t();
  const posts = (await listPosts()).slice(0, 3);
  return (
    <section className="container-x mt-16 sm:mt-24" aria-labelledby="from-blog">
      <div className="flex items-end justify-between gap-4 border-t border-line pt-8">
        <h2 id="from-blog" className="text-lg font-extrabold">{b.fromBlog}</h2>
        <Link href="/blog/" className="shrink-0 text-sm font-bold text-brand-dark hover:underline">{b.allPosts}</Link>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-6">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={postPath(p.slug)} className="block text-[15px] font-bold leading-snug hover:underline">{p.title}</Link>
            <p className="mt-1 text-xs text-ink-soft"><time dateTime={p.date}>{hebrewDate(p.date)}</time></p>
          </li>
        ))}
      </ul>
    </section>
  );
}
