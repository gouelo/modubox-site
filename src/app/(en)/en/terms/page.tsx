import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { TextPage, textMeta } from "@/views/TextPage";

export const generateMetadata = () => withSeo(textMeta("en", "terms"));

export default function Page() {
  return (
    <>
      <TextPage locale="en" page="terms" />
      <PageFaq path="/en/terms/" locale="en" />
    </>
  );
}
