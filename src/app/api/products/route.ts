import { NextResponse } from "next/server";
import { getPublishedProducts } from "@/lib/db/catalog";

export const dynamic = "force-dynamic";

// Public, read-only: published products by id, for the wishlist page
// (which only knows the ids saved in the browser). Same data the shop
// pages already show — nothing here that isn't public.
export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get("ids");
  if (!ids) return NextResponse.json({ products: [] });
  const wanted = new Set(ids.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100));
  const products = (await getPublishedProducts()).filter((p) => wanted.has(p.id));
  return NextResponse.json({ products });
}
