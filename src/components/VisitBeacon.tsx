"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { linkEvent } from "@/lib/analytics";

/**
 * The site's own visit statistics (src/lib/visits.ts): one small POST to
 * /api/visit/ on every page view, and on every WhatsApp or phone link click.
 * No cookie, nothing stored in the browser. Rendered on Vercel's production
 * build only, and it sends only on the real domain (`hosts`); the admin has
 * its own layout, so it never runs there.
 */
function send(body: Record<string, unknown>) {
  const data = JSON.stringify(body);
  try {
    if (navigator.sendBeacon?.("/api/visit/", new Blob([data], { type: "application/json" }))) return;
  } catch {
    /* fall back to fetch */
  }
  fetch("/api/visit/", { method: "POST", body: data, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}

export function VisitBeacon({ hosts }: { hosts: string[] }) {
  const path = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!hosts.includes(location.hostname.toLowerCase())) return;
    const q = new URLSearchParams(location.search);
    const entry = first.current;
    first.current = false;
    send({
      kind: "pageview",
      path: location.pathname,
      entry,
      ...(entry
        ? { referrer: document.referrer, utm_source: q.get("utm_source") ?? undefined, utm_medium: q.get("utm_medium") ?? undefined, gclid: q.has("gclid"), fbclid: q.has("fbclid") }
        : {}),
    });
  }, [path, hosts]);

  useEffect(() => {
    if (!hosts.includes(location.hostname.toLowerCase())) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      const ev = a ? linkEvent((a as HTMLAnchorElement).href) : null;
      if (ev) send({ kind: ev.event, path: location.pathname });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hosts]);

  return null;
}
