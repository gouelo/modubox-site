import { site } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { design3dLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";

/** "Design your shed in 3D": WhatsApp for now, the developer's configurator later (data/site.json → design3d.url). */
export function Design3DButton({ product, className = "" }: { product?: Product; className?: string }) {
  const external = !site.design3d.url || !site.design3d.url.startsWith("/");
  return (
    <a
      href={design3dLink(product)}
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
      className={`btn-brand w-full py-4 text-base ${className}`}
    >
      <Icon name="cube" className="size-6 shrink-0" />
      {site.design3d.label}
    </a>
  );
}
