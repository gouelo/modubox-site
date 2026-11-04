import { lp } from "@/i18n";
import { PageFaq } from "@/components/PageFaq";
import { withSeo } from "@/lib/seo/meta";
import { ProductPage, productMeta, productParams } from "@/views/ProductPage";

export const dynamicParams = false;
export const generateStaticParams = productParams;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return withSeo(await productMeta("en", (await params).slug));
}

export default async function Page({ params }: Props) {
  return (
    <>
      <ProductPage locale="en" slug={(await params).slug} />
      <PageFaq path={lp("en", `/product/${(await params).slug}/`)} locale="en" />
    </>
  );
}
