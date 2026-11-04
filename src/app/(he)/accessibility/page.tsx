import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { TextPage, textMeta } from "@/views/TextPage";

export const generateMetadata = () => withSeo(textMeta("he", "accessibility"));

export default function Page() {
  return (
    <>
      <TextPage locale="he" page="accessibility" />
      <PageFaq path="/accessibility/" locale="he" />
    </>
  );
}
