import { listPosts } from "@/lib/blog";
import { llmsText } from "@/lib/seo/llms";
import { loadSeo } from "@/lib/seo/store";

// /llms-full.txt: /llms.txt with every product's facts, every FAQ answer and the blog (src/lib/seo/llms.ts)
export const dynamic = "force-static";

export async function GET() {
  return new Response(llmsText(await loadSeo(), { full: true, posts: await listPosts() }), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
