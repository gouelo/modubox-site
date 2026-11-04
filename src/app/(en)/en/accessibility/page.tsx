import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { TextPage, textMeta } from "@/views/TextPage";

export const generateMetadata = () => withSeo(textMeta("en", "accessibility"));

export default function Page() {
  return (
    <>
      <TextPage locale="en" page="accessibility" />
      <PageFaq path="/en/accessibility/" locale="en" />
    </>
  );
}
