import { GalleryPage, galleryMeta } from "@/views/GalleryPage";

export const metadata = galleryMeta("he");

export default function Page() {
  return <GalleryPage locale="he" />;
}
