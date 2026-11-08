import { withSeo } from "@/lib/seo/meta";
import { CategoryPage, categoryMeta, categoryParams } from "@/views/CategoryPage";

// the landing pages by kind of shed, on the old site's addresses (/everest/, /garden-sheds/…): data/categories.json
export const generateStaticParams = categoryParams;
export const dynamicParams = false;

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  return withSeo(categoryMeta("he", (await params).category));
}

export default async function Page({ params }: Props) {
  return <CategoryPage locale="he" slug={(await params).category} />;
}
