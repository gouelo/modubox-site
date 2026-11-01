import { ProductPage, productMeta, productParams } from "@/views/ProductPage";

export const dynamicParams = false;
export const generateStaticParams = productParams;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return productMeta("en", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <ProductPage locale="en" slug={(await params).slug} />;
}
