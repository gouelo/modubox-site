import type { Metadata } from "next";
import { dict } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { CheckoutPage } from "@/views/CheckoutFlow";

export const metadata: Metadata = pageMeta("he", "/checkout/", { title: dict("he").meta.checkout.title, robots: { index: false } });

export default function Page() {
  return <CheckoutPage />;
}
