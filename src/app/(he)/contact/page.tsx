import { ContactPage, contactMeta } from "@/views/ContactPage";

export const metadata = contactMeta("he");

export default function Page() {
  return <ContactPage locale="he" />;
}
