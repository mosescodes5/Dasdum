"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/DataTable";

type Category = { id: string; name: string; slug: string; sortOrder: number };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    if (res.ok) {
      const data = (await res.json()) as any;
      setCategories(data.categories);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function bulkDelete(ids: string[]) {
    await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    load();
  }

  const columns: Column<Category>[] = [
    { key: "name", header: "Category", render: (c) => <Link href={`/admin/categories/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link> },
    { key: "slug", header: "Slug", render: (c) => <span className="text-muted font-mono text-xs">{c.slug}</span> },
    { key: "sortOrder", header: "Sort order", render: (c) => c.sortOrder },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary-deep">Categories</h1>
        <Link href="/admin/categories/new" className="flex items-center gap-1.5 bg-primary-deep text-bg px-4 py-2 text-sm hover:bg-primary">
          <Plus size={15} /> New category
        </Link>
      </div>

      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={categories ?? []}
          getRowId={(c) => c.id}
          onBulkDelete={bulkDelete}
          emptyMessage={categories === null ? "Loading…" : "No categories yet."}
        />
      </div>
    </div>
  );
}
