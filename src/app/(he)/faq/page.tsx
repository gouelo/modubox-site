import { withSeo } from "@/lib/seo/meta";
import { FaqPage, faqMeta } from "@/views/FaqPage";

export const generateMetadata = () => withSeo(faqMeta("he"));

export default function Page() {
  return <FaqPage locale="he" />;
}
