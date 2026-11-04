import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { ShopPage, shopMeta } from "@/views/ShopPage";

export const generateMetadata = () => withSeo(shopMeta("he"));

export default function Page() {
  return (
    <>
      <ShopPage locale="he" />
      <PageFaq path="/shop/" locale="he" />
    </>
  );
}
