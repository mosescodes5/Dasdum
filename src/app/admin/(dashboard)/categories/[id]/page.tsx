"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CategoryForm } from "@/components/admin/CategoryForm";
import type { CategoryFormValues } from "@/lib/validation/admin-category";

export default function EditCategoryPage() {
  const params = useParams<{ id: string }>();
  const [initial, setInitial] = useState<Partial<CategoryFormValues> | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/categories/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = (await res.json()) as any;
        const c = data.category;
        setInitial({
          name: c.name,
          slug: c.slug,
          description: c.description ?? "",
          sortOrder: c.sortOrder,
          seoTitle: c.seoTitle ?? "",
          seoDescription: c.seoDescription ?? "",
        });
      })
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) {
    return <p className="text-sm text-muted">That category couldn&rsquo;t be found.</p>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-primary-deep">Edit Category</h1>
      {initial ? <CategoryForm categoryId={params.id} initial={initial} /> : <p className="mt-6 text-sm text-muted">Loading…</p>}
    </div>
  );
}
