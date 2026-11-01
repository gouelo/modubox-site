import { TextPage, textMeta } from "@/views/TextPage";

export const metadata = textMeta("en", "terms");

export default function Page() {
  return <TextPage locale="en" page="terms" />;
}
