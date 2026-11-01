import { TextPage, textMeta } from "@/views/TextPage";

export const metadata = textMeta("en", "accessibility");

export default function Page() {
  return <TextPage locale="en" page="accessibility" />;
}
