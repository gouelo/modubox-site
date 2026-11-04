import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { BlogIndex, blogIndexMeta } from "@/views/BlogPages";

export const generateMetadata = () => withSeo(blogIndexMeta());

export default function Page() {
  return (
    <>
      <BlogIndex />
      <PageFaq path="/blog/" locale="he" />
    </>
  );
}
