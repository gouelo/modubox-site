import { TextPage, textMeta } from "@/views/TextPage";

export const metadata = textMeta("he", "warranty");

export default function Page() {
  return <TextPage locale="he" page="warranty" />;
}
