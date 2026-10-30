import { site } from "./catalog";
import type { Product } from "./types";

/**
 * The 3D configurator (data/site.json → design3d). Its embed script, loaded
 * site-wide, opens any link to the configurator's address in a side panel over
 * the page, on the model the link names (?model=3x2).
 */

/** The configurator's sizes in Israel: whole metres, width ≥ depth, 1 deep only up to 4 wide. */
const MODEL_RE = /^(?:[1-4]x1|[2-6]x2|[3-6]x3)$/;

/**
 * The configurator model a product opens on: `configuratorModel` in
 * data/products.json when set (null = none), otherwise its width×depth in
 * metres ("3x2") when the configurator has that size. Only Modubox sheds.
 */
export function configuratorModel(product: Product): string | null {
  if (product.category !== "modubox") return null;
  if (product.configuratorModel !== undefined) return product.configuratorModel;
  const model = `${product.widthM}x${product.depthM}`;
  return MODEL_RE.test(model) ? model : null;
}

/** Whether a page shows the 3D button: the configurator is set, and the product (if any) is a Modubox shed. */
export function hasDesign3d(product?: Product): boolean {
  return !!site.design3d.url && (!product || product.category === "modubox");
}

/**
 * Where a "design it in 3D" button goes: design3d.url with {model} (and {slug})
 * filled in for a product, or the configurator's entry page without them.
 */
export function design3dLink(product?: Product): string {
  const url = site.design3d.url;
  const model = product && configuratorModel(product);
  if (product && model) return url.replaceAll("{model}", model).replaceAll("{slug}", product.slug);
  // no model: drop the query parameters that need one
  return url.replace(/[?&][^?&=]+=[^&]*\{(?:model|slug)\}[^&]*/g, "").replace(/^([^?]*)&/, "$1?");
}
