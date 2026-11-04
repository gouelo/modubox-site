import { BlogIndex, blogIndexMeta } from "@/views/BlogPages";

export const metadata = blogIndexMeta();

export default function Page() {
  return <BlogIndex />;
}
