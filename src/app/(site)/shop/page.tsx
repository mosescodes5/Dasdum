import type { Metadata } from "next";
import { ShopListing, type ShopSearchParams } from "@/components/products/ShopListing";

export const metadata: Metadata = { title: "Shop" };

// ShopListing reads live MySQL data — see the note in src/app/(site)/page.tsx.
export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const params = await searchParams;
  return <ShopListing params={params} />;
}
