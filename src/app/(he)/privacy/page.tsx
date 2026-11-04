import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { TextPage, textMeta } from "@/views/TextPage";

export const generateMetadata = () => withSeo(textMeta("he", "privacy"));

export default function Page() {
  return (
    <>
      <TextPage locale="he" page="privacy" />
      <PageFaq path="/privacy/" locale="he" />
    </>
  );
}
