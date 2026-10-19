"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import type { ProductFormValues } from "@/lib/validation/admin-product";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [initial, setInitial] = useState<Partial<ProductFormValues> | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<{ id: string; url: string }[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/products/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = (await res.json()) as any;
        const p = data.product;
        setFeaturedImageUrl(p.featuredImageUrl ?? null);
        setGalleryImages(data.product.galleryImages ?? []);
        setInitial({
          name: p.name,
          slug: p.slug,
          shortDescription: p.shortDescription ?? "",
          description: p.description ?? "",
          price: p.price,
          salePrice: p.salePrice,
          sku: p.sku,
          stock: p.stock,
          categoryId: p.categoryId ?? "",
          tags: p.tags ? JSON.parse(p.tags).join(", ") : "",
          featuredImageMediaId: p.featuredImageMediaId ?? undefined,
          seoTitle: p.seoTitle ?? "",
          seoDescription: p.seoDescription ?? "",
          status: p.status,
        });
      })
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) {
    return <p className="text-sm text-muted">That product couldn&rsquo;t be found.</p>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-primary-deep">Edit Product</h1>
      {initial ? (
        <ProductForm
          productId={params.id}
          initial={initial}
          initialFeaturedImageUrl={featuredImageUrl}
          initialGalleryImages={galleryImages}
        />
      ) : (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      )}
    </div>
  );
}
