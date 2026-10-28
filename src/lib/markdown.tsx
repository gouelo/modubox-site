// A tiny Markdown renderer for the terms / warranty pages (headings, lists, quotes, bold, links).
import Link from "next/link";
import type { ReactNode } from "react";

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${key}-${i++}`}>{m[1]}</strong>);
    else out.push(<Link key={`${key}-${i++}`} href={m[3].endsWith("/") ? m[3] : `${m[3]}/`}>{m[2]}</Link>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(<Tag key={blocks.length}>{list.items.map((t, i) => <li key={i}>{inline(t, `li${blocks.length}-${i}`)}</li>)}</Tag>);
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
    if (line.startsWith("### ")) blocks.push(<h3 key={k}>{inline(line.slice(4), `h${k}`)}</h3>);
    else if (line.startsWith("## ")) blocks.push(<h2 key={k}>{inline(line.slice(3), `h${k}`)}</h2>);
    else if (line.startsWith("# ")) blocks.push(<h1 key={k}>{inline(line.slice(2), `h${k}`)}</h1>);
    else if (line.startsWith("> ")) blocks.push(<blockquote key={k}>{inline(line.slice(2), `q${k}`)}</blockquote>);
    else blocks.push(<p key={k}>{inline(line, `p${k}`)}</p>);
  }
  flush();
  return <div className="prose-he">{blocks}</div>;
}
