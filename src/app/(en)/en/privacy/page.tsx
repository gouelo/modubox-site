import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { TextPage, textMeta } from "@/views/TextPage";

export const generateMetadata = () => withSeo(textMeta("en", "privacy"));

export default function Page() {
  return (
    <>
      <TextPage locale="en" page="privacy" />
      <PageFaq path="/en/privacy/" locale="en" />
    </>
  );
}
