import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { ContactPage, contactMeta } from "@/views/ContactPage";

export const generateMetadata = () => withSeo(contactMeta("he"));

export default function Page() {
  return (
    <>
      <ContactPage locale="he" />
      <PageFaq path="/contact/" locale="he" />
    </>
  );
}
