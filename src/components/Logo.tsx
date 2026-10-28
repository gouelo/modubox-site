import { site } from "@/lib/catalog";
import { asset } from "@/lib/paths";

export function Logo({ white = false, className = "h-8 w-auto" }: { white?: boolean; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset(white ? site.logoWhite : site.logo)} alt="מודובוקס – Modubox" className={className} width={160} height={32} />;
}
