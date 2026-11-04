import { withSeo } from "@/lib/seo/meta";
import { FaqPage, faqMeta } from "@/views/FaqPage";

export const generateMetadata = () => withSeo(faqMeta("en"));

export default function Page() {
  return <FaqPage locale="en" />;
}
