import { pageMeta } from "@/i18n/meta";
import { HomePage } from "@/views/HomePage";

export const metadata = pageMeta("he", "/");

export default function Page() {
  return <HomePage locale="he" />;
}
