import type { Metadata } from "next";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "סל הקניות", robots: { index: false } };

export default function Page() {
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">סל הקניות</h1>
      <CartView />
    </div>
  );
}
