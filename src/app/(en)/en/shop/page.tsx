import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { ShopPage, shopMeta } from "@/views/ShopPage";

export const generateMetadata = () => withSeo(shopMeta("en"));

export default function Page() {
  return (
    <>
      <ShopPage locale="en" />
      <PageFaq path="/en/shop/" locale="en" />
    </>
  );
}
