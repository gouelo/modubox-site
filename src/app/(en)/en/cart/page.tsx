import type { Metadata } from "next";
import { dict } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { CartPage } from "@/views/CartView";

export const metadata: Metadata = pageMeta("en", "/cart/", { title: dict("en").meta.cart.title, robots: { index: false } });

export default function Page() {
  return <CartPage />;
}
