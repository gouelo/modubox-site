import { TextPage, textMeta } from "@/views/TextPage";

export const metadata = textMeta("he", "accessibility");

export default function Page() {
  return <TextPage locale="he" page="accessibility" />;
}
