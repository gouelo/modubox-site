import { TextPage, textMeta } from "@/views/TextPage";

export const metadata = textMeta("en", "warranty");

export default function Page() {
  return <TextPage locale="en" page="warranty" />;
}
