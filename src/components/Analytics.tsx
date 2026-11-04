"use client";
import Script from "next/script";
import { useEffect } from "react";
import { linkEvent, track } from "@/lib/analytics";

/**
 * Google Tag Manager (Google's own snippet), and one click listener for the
 * whole site: every WhatsApp and phone link pushes whatsapp_click or
 * phone_click, wherever it is. Rendered only when GTM is on (src/lib/analytics.ts).
 */
export function GoogleTagManager({ id }: { id: string }) {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a) return;
      const ev = linkEvent((a as HTMLAnchorElement).href);
      if (!ev) return;
      const text = (a.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
      track({ ...ev, link_text: text });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <Script id="gtm" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}
    </Script>
  );
}

/** GTM for browsers without JavaScript, right after <body>. */
export function GoogleTagManagerNoScript({ id }: { id: string }) {
  return (
    <noscript>
      <iframe src={`https://www.googletagmanager.com/ns.html?id=${id}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} />
    </noscript>
  );
}
