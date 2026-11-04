import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { AboutPage, aboutMeta } from "@/views/AboutPage";

export const generateMetadata = () => withSeo(aboutMeta("he"));

export default function Page() {
  return (
    <>
      <AboutPage locale="he" />
      <PageFaq path="/about/" locale="he" />
    </>
  );
}
