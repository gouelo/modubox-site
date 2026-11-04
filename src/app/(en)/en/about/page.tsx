import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { AboutPage, aboutMeta } from "@/views/AboutPage";

export const generateMetadata = () => withSeo(aboutMeta("en"));

export default function Page() {
  return (
    <>
      <AboutPage locale="en" />
      <PageFaq path="/en/about/" locale="en" />
    </>
  );
}
