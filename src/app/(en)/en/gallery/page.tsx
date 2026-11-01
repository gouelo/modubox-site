import { GalleryPage, galleryMeta } from "@/views/GalleryPage";

export const metadata = galleryMeta("en");

export default function Page() {
  return <GalleryPage locale="en" />;
}
