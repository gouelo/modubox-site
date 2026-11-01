import type { Metadata } from "next";
import Link from "next/link";
import { rootMetadata, SiteShell } from "@/components/SiteShell";
import { dict, lp } from "@/i18n";
import "./globals.css";

export { viewport } from "@/components/SiteShell";
export const metadata: Metadata = { ...rootMetadata("he"), title: `404 – ${dict("he").notFound.title} · ${dict("en").notFound.title}` };

/**
 * Any address that matches no page (the site has two root layouts, Hebrew and
 * English, so this one 404 serves both): the Hebrew shell, with the message in
 * both languages.
 */
export default function GlobalNotFound() {
  const he = dict("he").notFound;
  const en = dict("en").notFound;
  return (
    <SiteShell locale="he">
      <div className="container-x grid min-h-[60vh] place-items-center py-20 text-center">
        <div>
          <p className="text-7xl font-black text-brand-dark">404</p>
          <h1 className="mt-3 text-3xl font-extrabold">{he.title}</h1>
          <p className="mt-2 text-ink-soft">{he.text}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/" className="btn-primary">
              {he.home}
            </Link>
            <Link href="/shop/" className="btn-ghost">
              {dict("he").common.toCatalog}
            </Link>
          </div>
          <div lang="en" dir="ltr" className="mt-12 border-t border-line pt-8">
            <h2 className="text-2xl font-extrabold">{en.title}</h2>
            <p className="mt-2 text-ink-soft">{en.text}</p>
            <Link href={lp("en", "/")} className="btn-ghost mt-5">
              {en.home}
            </Link>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
