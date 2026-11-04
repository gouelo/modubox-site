import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { TextPage, textMeta } from "@/views/TextPage";

export const generateMetadata = () => withSeo(textMeta("en", "warranty"));

export default function Page() {
  return (
    <>
      <TextPage locale="en" page="warranty" />
      <PageFaq path="/en/warranty/" locale="en" />
    </>
  );
}
