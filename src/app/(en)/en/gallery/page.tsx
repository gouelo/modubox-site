import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { GalleryPage, galleryMeta } from "@/views/GalleryPage";

export const generateMetadata = () => withSeo(galleryMeta("en"));

export default function Page() {
  return (
    <>
      <GalleryPage locale="en" />
      <PageFaq path="/en/gallery/" locale="en" />
    </>
  );
}
