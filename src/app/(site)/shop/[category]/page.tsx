import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/db/catalog";
import { ShopListing, type ShopSearchParams } from "@/components/products/ShopListing";

// Categories come from the database (admin-managed), so this must render
// at request time — see the note in src/app/(site)/page.tsx.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const match = (await getCategories()).find((c) => c.slug === category);
  return { title: match?.name ?? "Shop" };
}

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<ShopSearchParams>;
}) {
  const { category } = await params;
  if (!(await getCategories()).some((c) => c.slug === category)) notFound();

  const query = await searchParams;
  return <ShopListing params={{ ...query, category }} />;
}
