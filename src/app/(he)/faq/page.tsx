import { FaqPage, faqMeta } from "@/views/FaqPage";

export const metadata = faqMeta("he");

export default function Page() {
  return <FaqPage locale="he" />;
}
