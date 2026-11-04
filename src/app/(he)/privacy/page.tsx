import { TextPage, textMeta } from "@/views/TextPage";

export const metadata = textMeta("he", "privacy");

export default function Page() {
  return <TextPage locale="he" page="privacy" />;
}
