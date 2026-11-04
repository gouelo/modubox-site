import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { TextPage, textMeta } from "@/views/TextPage";

export const generateMetadata = () => withSeo(textMeta("he", "warranty"));

export default function Page() {
  return (
    <>
      <TextPage locale="he" page="warranty" />
      <PageFaq path="/warranty/" locale="he" />
    </>
  );
}
