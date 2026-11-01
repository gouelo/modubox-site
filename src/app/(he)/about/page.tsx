import { AboutPage, aboutMeta } from "@/views/AboutPage";

export const metadata = aboutMeta("he");

export default function Page() {
  return <AboutPage locale="he" />;
}
