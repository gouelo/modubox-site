import type { Metadata } from "next";
import { CheckoutFlow } from "./CheckoutFlow";

export const metadata: Metadata = { title: "השלמת הזמנה", robots: { index: false } };

export default function Page() {
  return (
    <div className="container-x max-w-5xl py-10">
      <CheckoutFlow />
    </div>
  );
}
