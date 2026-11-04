import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { BlogPost, postMeta, postParams } from "@/views/BlogPages";

// no dynamicParams = false: on the server a post first saved in the admin shows without a new
// deploy (an unknown slug is a 404: BlogPost); the GitHub Pages export has the posts it was built with
export const generateStaticParams = postParams;

type Props = { params: Promise<{ slug: string }> };

// the slugs are Hebrew, so the address may arrive percent-encoded
const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export async function generateMetadata({ params }: Props) {
  return withSeo(await postMeta(decode((await params).slug)));
}

export default async function Page({ params }: Props) {
  return (
    <>
      <BlogPost slug={decode((await params).slug)} />
      <PageFaq path={`/blog/${decode((await params).slug)}/`} locale="he" />
    </>
  );
}
