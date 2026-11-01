import { pageMeta } from "@/i18n/meta";
import { HomePage } from "@/views/HomePage";

export const metadata = pageMeta("en", "/");

export default function Page() {
  return <HomePage locale="en" />;
}
