// A tiny Markdown renderer for the terms / warranty pages (headings, lists, quotes, bold, links).
import Link from "next/link";
import type { ReactNode } from "react";
import { lp, type Locale } from "@/i18n/config";

function inline(text: string, key: string, locale: Locale): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${key}-${i++}`}>{m[1]}</strong>);
    else if (/^(https?:|mailto:|tel:)/.test(m[3])) out.push(<a key={`${key}-${i++}`} href={m[3]} {...(m[3].startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>{m[2]}</a>);
    else {
      // "he:/terms" links to the Hebrew page from the English one
      const he = m[3].startsWith("he:");
      const path = he ? m[3].slice(3) : m[3];
      const href = lp(he ? "he" : locale, path.endsWith("/") ? path : `${path}/`);
      out.push(he ? <a key={`${key}-${i++}`} href={href} hrefLang="he">{m[2]}</a> : <Link key={`${key}-${i++}`} href={href}>{m[2]}</Link>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** `{{name}}` in the source is replaced by vars.name (site details in the accessibility statement). */
export function Markdown({ source, locale = "he", vars = {} }: { source: string; locale?: Locale; vars?: Record<string, string> }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m).split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(<Tag key={blocks.length}>{list.items.map((t, i) => <li key={i}>{inline(t, `li${blocks.length}-${i}`, locale)}</li>)}</Tag>);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    const ol = line.match(/^\d+\.\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ol || ul) {
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ol ?? ul)![1]);
      continue;
    }
    flush();
    if (!line) continue;
    const k = blocks.length;
    if (line.startsWith("### ")) blocks.push(<h3 key={k}>{inline(line.slice(4), `h${k}`, locale)}</h3>);
    else if (line.startsWith("## ")) blocks.push(<h2 key={k}>{inline(line.slice(3), `h${k}`, locale)}</h2>);
    else if (line.startsWith("# ")) blocks.push(<h1 key={k}>{inline(line.slice(2), `h${k}`, locale)}</h1>);
    else if (line.startsWith("> ")) blocks.push(<blockquote key={k}>{inline(line.slice(2), `q${k}`, locale)}</blockquote>);
    else blocks.push(<p key={k}>{inline(line, `p${k}`, locale)}</p>);
  }
  flush();
  return <div className="prose-he">{blocks}</div>;
}
