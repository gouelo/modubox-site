import { ProductPage, productMeta, productParams } from "@/views/ProductPage";

export const dynamicParams = false;
export const generateStaticParams = productParams;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return productMeta("he", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <ProductPage locale="he" slug={(await params).slug} />;
}
