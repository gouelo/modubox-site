import { ShopPage, shopMeta } from "@/views/ShopPage";

export const metadata = shopMeta("he");

export default function Page() {
  return <ShopPage locale="he" />;
}
