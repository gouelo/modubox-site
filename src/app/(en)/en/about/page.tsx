import { AboutPage, aboutMeta } from "@/views/AboutPage";

export const metadata = aboutMeta("en");

export default function Page() {
  return <AboutPage locale="en" />;
}
