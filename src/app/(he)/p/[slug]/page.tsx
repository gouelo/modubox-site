import type { Metadata } from "next";
import { notFound } from "next/navigation";
import testFile from "../../../../../data/test-product.json";
import { TEST_SLUG, testProduct } from "@/lib/catalog";
import { TestProductPage } from "@/views/TestProductPage";

// The hidden 1 ₪ test product (data/test-product.json). Only its slug is built;
// with enabled: false the page is a 404.
export const dynamicParams = false;
export const generateStaticParams = () => [{ slug: testFile.product.slug }];

export const metadata: Metadata = { title: "בדיקת תשלום", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const product = testProduct("he");
  if (!product || slug !== TEST_SLUG) notFound();
  return <TestProductPage slug={product.slug} />;
}
