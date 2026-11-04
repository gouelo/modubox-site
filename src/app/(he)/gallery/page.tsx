import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { GalleryPage, galleryMeta } from "@/views/GalleryPage";

export const generateMetadata = () => withSeo(galleryMeta("he"));

export default function Page() {
  return (
    <>
      <GalleryPage locale="he" />
      <PageFaq path="/gallery/" locale="he" />
    </>
  );
}
