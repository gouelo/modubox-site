import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { pageMeta } from "@/i18n/meta";
import { HomePage } from "@/views/HomePage";

export const generateMetadata = () => withSeo(pageMeta("he", "/"));

export default function Page() {
  return (
    <>
      <HomePage locale="he" />
      <PageFaq path="/" locale="he" />
    </>
  );
}
