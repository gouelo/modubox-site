"use client";
import { useSearchParams } from "next/navigation";
import { Configurator } from "@/components/configurator/Configurator";
import { getProduct, productsIn } from "@/lib/catalog";

export function ConfiguratorPage() {
  const params = useSearchParams();
  const sizes = productsIn("modubox").filter((p) => p.configurable);
  const product = getProduct(params.get("size") ?? "") ?? sizes.find((p) => p.slug === "modubox-2x2") ?? sizes[0];
  return <Configurator product={product} sizes={sizes} />;
}
