import { site } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { design3dLink } from "@/lib/whatsapp";
import { Icon } from "./Icon";

/**
 * "Design your shed in 3D": WhatsApp for now, the developer's configurator later
 * (data/site.json → design3d.url). `tile` is the quieter variant for product pages.
 */
export function Design3DButton({ product, className = "", variant = "solid" }: { product?: Product; className?: string; variant?: "solid" | "tile" }) {
  const external = !site.design3d.url || !site.design3d.url.startsWith("/");
  const link = { href: design3dLink(product), ...(external ? { target: "_blank", rel: "noopener" } : {}) };
  if (variant === "tile")
    return (
      <a {...link} className={`group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 pe-4 transition-all duration-300 hover:border-brand hover:shadow-soft ${className}`}>
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-petrol to-brand text-white transition-transform duration-500 group-hover:rotate-[-8deg]">
          <Icon name="cube" className="size-5" />
        </span>
        <span className="flex-1 text-[15px] font-bold leading-snug">{site.design3d.label}</span>
        <Icon name="arrow" className="size-4 shrink-0 text-ink/40 transition group-hover:-translate-x-1 group-hover:text-brand-dark" />
      </a>
    );
  return (
    <a {...link} className={`btn-brand w-full py-4 text-base ${className}`}>
      <Icon name="cube" className="size-6 shrink-0" />
      {site.design3d.label}
    </a>
  );
}
