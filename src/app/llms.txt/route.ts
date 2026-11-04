import { llmsText } from "@/lib/seo/llms";
import { loadSeo } from "@/lib/seo/store";

// /llms.txt: src/lib/seo/llms.ts. Static, rebuilt when the admin saves (src/lib/seo/revalidate.ts).
export const dynamic = "force-static";

export async function GET() {
  return new Response(llmsText(await loadSeo()), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
