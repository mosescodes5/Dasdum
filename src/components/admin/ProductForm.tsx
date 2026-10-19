"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductFormValues } from "@/lib/validation/admin-product";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { DropzoneUpload } from "@/components/admin/DropzoneUpload";
import { draftShortDescription, draftDescription, draftSeoTitle, draftSeoDescription } from "@/lib/autogen";

type Category = { id: string; name: string };

type GalleryItem = { id: string; url: string };

// Fields the form fills in by itself until the admin types in them.
type AutoField = "slug" | "sku" | "shortDescription" | "description" | "seoTitle" | "seoDescription";

function AutoHint({ auto, onRegenerate, note }: { auto: boolean; onRegenerate: () => void; note?: string }) {
  if (auto) return <p className="mt-1 text-xs text-muted">{note ?? "Auto-generated — type to override."}</p>;
  return (
    <button type="button" onClick={onRegenerate} className="mt-1 text-xs text-primary-deep link-underline">
      Regenerate automatically
    </button>
  );
}

type Props = {
  productId?: string; // present when editing
  initial?: Partial<ProductFormValues>;
  initialFeaturedImageUrl?: string | null;
  initialGalleryImages?: GalleryItem[];
};

export function ProductForm({ productId, initial, initialFeaturedImageUrl, initialGalleryImages }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<{ id: string; url: string } | null>(
    initial?.featuredImageMediaId && initialFeaturedImageUrl
      ? { id: initial.featuredImageMediaId, url: initialFeaturedImageUrl }
      : null
  );
  // Extra photos for the product detail page's gallery, beyond the single
  // featured image above (which is what shows in shop/listing thumbnails).
  const [gallery, setGallery] = useState<GalleryItem[]>(initialGalleryImages ?? []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { status: "draft", stock: 0, price: 0, ...initial },
  });

  // New products start fully automatic; an existing product keeps what it
  // has (nothing is overwritten) and offers "Regenerate" per field instead.
  const isEdit = Boolean(productId);
  const [auto, setAuto] = useState<Record<AutoField, boolean>>({
    slug: !isEdit, sku: !isEdit, shortDescription: !isEdit, description: !isEdit, seoTitle: !isEdit, seoDescription: !isEdit,
  });
  const markManual = (f: AutoField) => setAuto((a) => (a[f] ? { ...a, [f]: false } : a));

  const watchedName = watch("name");
  const watchedCategoryId = watch("categoryId");
  const watchedShort = watch("shortDescription");
  const categoryName = categories.find((c) => c.id === watchedCategoryId)?.name;

  // Text drafts: re-derived whenever the name/category changes, but only into
  // fields still marked automatic — typing in a field takes it over for good.
  useEffect(() => {
    const name = (watchedName ?? "").trim();
    const fill = (f: AutoField, value: string) => {
      if (auto[f]) setValue(f, value, { shouldDirty: true });
    };
    fill("shortDescription", name ? draftShortDescription(name, categoryName) : "");
    fill("description", name ? draftDescription(name, categoryName) : "");
    fill("seoTitle", name ? draftSeoTitle(name, categoryName) : "");
    fill("seoDescription", name ? draftSeoDescription(name, categoryName, auto.shortDescription ? undefined : watchedShort) : "");
  }, [watchedName, categoryName, watchedShort, auto, setValue]);

  // Slug and SKU come from the server so they are guaranteed free (a taken
  // slug becomes name-2, SKUs count up per category). Debounced while typing.
  useEffect(() => {
    const name = (watchedName ?? "").trim();
    const wantSlug = auto.slug && name;
    const wantSku = auto.sku && watchedCategoryId;
    if (!wantSlug && !wantSku) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const qs = new URLSearchParams({ name, categoryId: watchedCategoryId ?? "" });
      if (productId) qs.set("excludeId", productId);
      const res = await fetch(`/api/admin/products/suggest?${qs}`).catch(() => null);
      if (!res || !res.ok || cancelled) return;
      const data = (await res.json()) as { slug: string | null; sku: string | null };
      if (wantSlug && data.slug) setValue("slug", data.slug, { shouldValidate: true });
      if (wantSku && data.sku) setValue("sku", data.sku, { shouldValidate: true });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [watchedName, watchedCategoryId, auto.slug, auto.sku, productId, setValue]);

  function regenerate(f: AutoField) {
    if (f === "slug" && isEdit && !confirm("Changing the slug changes this product's web address — old links to it will stop working. Continue?")) return;
    setAuto((a) => ({ ...a, [f]: true }));
  }

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data: any) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  async function onSubmit(values: ProductFormValues) {
    setSubmitting(true);
    setServerError(null);
    const res = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
      method: productId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, galleryMediaIds: gallery.map((g) => g.id) }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as any;
      setServerError(typeof data?.error === "string" ? data.error : "Please check the form for errors.");
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  async function onDelete() {
    if (!productId) return;
    if (!confirm("Delete this product? This can't be undone.")) return;
    setDeleting(true);
    await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <div className="space-y-6">
        <section className="border border-hairline bg-white p-5 space-y-4">
          <div>
            <label className="text-sm">Product name</label>
            <input {...register("name")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm">Slug</label>
            <input {...register("slug", { onChange: () => markManual("slug") })} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm font-mono" />
            {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
            <AutoHint auto={auto.slug} onRegenerate={() => regenerate("slug")} note="Auto-generated from the name — type to override." />
          </div>
          <div>
            <label className="text-sm">Short description</label>
            <input {...register("shortDescription", { onChange: () => markManual("shortDescription") })} maxLength={200} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
            <AutoHint auto={auto.shortDescription} onRegenerate={() => regenerate("shortDescription")} note="Auto-drafted from the name and category — edit it." />
          </div>
          <div>
            <label className="text-sm">Description</label>
            <textarea {...register("description", { onChange: () => markManual("description") })} rows={6} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
            <AutoHint auto={auto.description} onRegenerate={() => regenerate("description")} note="Auto-drafted placeholder — add materials, sizes and care details." />
          </div>
        </section>

        <section className="border border-hairline bg-white p-5 space-y-4">
          <h2 className="text-sm font-medium text-primary-deep">Pricing &amp; Inventory</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm">Price (pence)</label>
              <input type="number" {...register("price")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
              {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
            </div>
            <div>
              <label className="text-sm">Sale price (pence)</label>
              <input type="number" {...register("salePrice")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-sm">Stock</label>
              <input type="number" {...register("stock")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm">SKU</label>
            <input {...register("sku", { onChange: () => markManual("sku") })} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
            {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>}
            <AutoHint
              auto={auto.sku}
              onRegenerate={() => regenerate("sku")}
              note={watchedCategoryId ? "Auto-generated from the category — type to override." : "Choose a category and the SKU fills in by itself."}
            />
          </div>
        </section>

        <section className="border border-hairline bg-white p-5 space-y-4">
          <h2 className="text-sm font-medium text-primary-deep">SEO</h2>
          <div>
            <label className="text-sm">SEO title</label>
            <input {...register("seoTitle", { onChange: () => markManual("seoTitle") })} maxLength={70} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
            <AutoHint auto={auto.seoTitle} onRegenerate={() => regenerate("seoTitle")} note="Auto-generated. The site adds “| DASDUM” to it itself." />
          </div>
          <div>
            <label className="text-sm">SEO description</label>
            <textarea {...register("seoDescription", { onChange: () => markManual("seoDescription") })} rows={3} maxLength={160} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
            <AutoHint auto={auto.seoDescription} onRegenerate={() => regenerate("seoDescription")} note="Auto-generated from the short description (max 160 characters)." />
          </div>
        </section>
      </div>

      <aside className="space-y-6 h-fit">
        <section className="border border-hairline bg-white p-5 space-y-4">
          <div>
            <label className="text-sm">Status</label>
            <select {...register("status")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Category</label>
            <select {...register("categoryId")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm">
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId.message}</p>}
          </div>
          <div>
            <label className="text-sm">Tags (comma-separated)</label>
            <input {...register("tags")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
          </div>
        </section>

        <section className="border border-hairline bg-white p-5">
          <h2 className="text-sm font-medium text-primary-deep mb-3">Featured image</h2>
          {featuredImage ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featuredImage.url} alt="" className="aspect-square w-full object-cover border border-hairline" />
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFeaturedImage(null);
                    setValue("featuredImageMediaId", null);
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove image
                </button>
                <button type="button" onClick={() => setPickerOpen(true)} className="text-xs text-primary-deep link-underline">
                  Change image
                </button>
              </div>
            </div>
          ) : (
            <>
              <DropzoneUpload
                onUploaded={(item) => {
                  setFeaturedImage(item);
                  setValue("featuredImageMediaId", item.id);
                }}
              />
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-3 w-full text-center text-xs text-primary-deep link-underline"
              >
                Or choose from Media Library
              </button>
            </>
          )}
        </section>

        <section className="border border-hairline bg-white p-5">
          <h2 className="text-sm font-medium text-primary-deep mb-1">Gallery</h2>
          <p className="text-xs text-muted mb-3">
            Extra photos shown on the product page — front, back, packaging, worn/in use, etc. The
            featured image above is separate and is what shows in the shop grid.
          </p>
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {gallery.map((img, i) => (
                <div key={img.id} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="aspect-square w-full object-cover border border-hairline" />
                  <button
                    type="button"
                    onClick={() => setGallery((g) => g.filter((_, j) => j !== i))}
                    aria-label="Remove"
                    className="absolute top-1 right-1 h-5 w-5 bg-black/60 text-white text-xs leading-none hover:bg-red-600"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() =>
                        setGallery((g) => {
                          const next = [...g];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          return next;
                        })
                      }
                      aria-label="Move earlier"
                      className="h-5 w-5 bg-black/60 text-white text-xs leading-none disabled:opacity-30 hover:bg-black/80"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      disabled={i === gallery.length - 1}
                      onClick={() =>
                        setGallery((g) => {
                          const next = [...g];
                          [next[i], next[i + 1]] = [next[i + 1], next[i]];
                          return next;
                        })
                      }
                      aria-label="Move later"
                      className="h-5 w-5 bg-black/60 text-white text-xs leading-none disabled:opacity-30 hover:bg-black/80"
                    >
                      ›
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DropzoneUpload
            multiple
            compact
            onUploaded={(item) => setGallery((g) => [...g, item])}
          />
        </section>

        <MediaPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            setFeaturedImage(item);
            setValue("featuredImageMediaId", item.id);
          }}
        />

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-deep text-bg py-3 text-sm hover:bg-primary transition-colors disabled:opacity-60"
        >
          {submitting ? "Saving…" : productId ? "Save changes" : "Create product"}
        </button>

        {productId && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="w-full border border-red-300 text-red-600 py-2.5 text-sm hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete product"}
          </button>
        )}
      </aside>
    </form>
  );
}
