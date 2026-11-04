import { TextPage, textMeta } from "@/views/TextPage";

export const metadata = textMeta("en", "privacy");

export default function Page() {
  return <TextPage locale="en" page="privacy" />;
}
