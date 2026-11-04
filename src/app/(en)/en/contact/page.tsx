import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { ContactPage, contactMeta } from "@/views/ContactPage";

export const generateMetadata = () => withSeo(contactMeta("en"));

export default function Page() {
  return (
    <>
      <ContactPage locale="en" />
      <PageFaq path="/en/contact/" locale="en" />
    </>
  );
}
