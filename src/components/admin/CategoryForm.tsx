"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryFormValues } from "@/lib/validation/admin-category";

type Props = {
  categoryId?: string;
  initial?: Partial<CategoryFormValues>;
};

export function CategoryForm({ categoryId, initial }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { sortOrder: 0, ...initial },
  });

  async function onSubmit(values: CategoryFormValues) {
    setSubmitting(true);
    setServerError(null);
    const res = await fetch(categoryId ? `/api/admin/categories/${categoryId}` : "/api/admin/categories", {
      method: categoryId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as any;
      setServerError(typeof data?.error === "string" ? data.error : "Please check the form for errors.");
      return;
    }
    router.push("/admin/categories");
    router.refresh();
  }

  async function onDelete() {
    if (!categoryId) return;
    if (!confirm("Delete this category? Products in it will need reassigning.")) return;
    setDeleting(true);
    await fetch(`/api/admin/categories/${categoryId}`, { method: "DELETE" });
    router.push("/admin/categories");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 max-w-lg space-y-4">
      <div className="border border-hairline bg-white p-5 space-y-4">
        <div>
          <label className="text-sm">Name</label>
          <input {...register("name")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm">Slug</label>
          <input {...register("slug")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm font-mono" />
          {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
        </div>
        <div>
          <label className="text-sm">Description</label>
          <textarea {...register("description")} rows={3} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm">Sort order</label>
          <input type="number" {...register("sortOrder")} className="mt-1.5 w-32 border border-hairline px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="border border-hairline bg-white p-5 space-y-4">
        <h2 className="text-sm font-medium text-primary-deep">SEO</h2>
        <div>
          <label className="text-sm">SEO title</label>
          <input {...register("seoTitle")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm">SEO description</label>
          <textarea {...register("seoDescription")} rows={2} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
        </div>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="bg-primary-deep text-bg px-6 py-2.5 text-sm hover:bg-primary disabled:opacity-60">
          {submitting ? "Saving…" : categoryId ? "Save changes" : "Create category"}
        </button>
        {categoryId && (
          <button type="button" onClick={onDelete} disabled={deleting} className="border border-red-300 text-red-600 px-5 py-2.5 text-sm hover:bg-red-50 disabled:opacity-60">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}
