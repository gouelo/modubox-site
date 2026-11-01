import { ShopPage, shopMeta } from "@/views/ShopPage";

export const metadata = shopMeta("en");

export default function Page() {
  return <ShopPage locale="en" />;
}
