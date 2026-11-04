import type { Metadata } from "next";
import { dict } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { PaymentResult } from "@/views/PaymentResult";

export const metadata: Metadata = pageMeta("he", "/checkout/success/", { title: dict("he").meta.paymentSuccess.title, robots: { index: false } });

export default function Page() {
  return <PaymentResult result="success" />;
}
