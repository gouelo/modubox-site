import { ContentNav } from "@/components/admin/ContentNav";
import { requireAdmin } from "@/lib/admin/session";

/** The content module (SEO, blog, redirects, AI): owner and the content role. */
export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("content");
  return (
    <>
      <ContentNav />
      {children}
    </>
  );
}
