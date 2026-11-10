import { site } from "@/lib/catalog";
import { asset } from "@/lib/paths";

/** The logo; the header's home link gives it its own alt ("Modubox – Home"), which names the link. */
export function Logo({ white = false, className = "h-8 w-auto", alt = "מודובוקס – Modubox" }: { white?: boolean; className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset(white ? site.logoWhite : site.logo)} alt={alt} className={className} width={171} height={32} />;
}
