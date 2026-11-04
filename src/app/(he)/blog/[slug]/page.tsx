import { BlogPost, postMeta, postParams } from "@/views/BlogPages";

export const dynamicParams = false;
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
  return postMeta(decode((await params).slug));
}

export default async function Page({ params }: Props) {
  return <BlogPost slug={decode((await params).slug)} />;
}
