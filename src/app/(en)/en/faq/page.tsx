import { FaqPage, faqMeta } from "@/views/FaqPage";

export const metadata = faqMeta("en");

export default function Page() {
  return <FaqPage locale="en" />;
}
