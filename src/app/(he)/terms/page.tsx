import { TextPage, textMeta } from "@/views/TextPage";

export const metadata = textMeta("he", "terms");

export default function Page() {
  return <TextPage locale="he" page="terms" />;
}
