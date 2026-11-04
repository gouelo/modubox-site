import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { TextPage, textMeta } from "@/views/TextPage";

export const generateMetadata = () => withSeo(textMeta("he", "terms"));

export default function Page() {
  return (
    <>
      <TextPage locale="he" page="terms" />
      <PageFaq path="/terms/" locale="he" />
    </>
  );
}
