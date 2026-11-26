import Script from "next/script";
import { asset } from "@/lib/paths";

/**
 * Gambot's call-tracking widget (public/gambot-call.js: the script from Gambot, kept as it is
 * except its config). Loaded after the page is interactive, and only on the hosts GTM loads on
 * (src/lib/analytics.ts gtmHosts): the browser checks the hostname, so previews never load it.
 */
export function GambotCall({ hosts }: { hosts: string[] }) {
  return (
    <Script id="gambot-call" strategy="afterInteractive">
      {`if(${JSON.stringify(hosts)}.indexOf(location.hostname.toLowerCase())>=0){var s=document.createElement('script');s.src=${JSON.stringify(asset("/gambot-call.js"))};s.async=true;document.body.appendChild(s)}`}
    </Script>
  );
}
