import { ContactPage, contactMeta } from "@/views/ContactPage";

export const metadata = contactMeta("en");

export default function Page() {
  return <ContactPage locale="en" />;
}
