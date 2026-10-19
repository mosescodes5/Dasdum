"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { blogPostSchema, type BlogPostFormValues } from "@/lib/validation/admin-blog";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { DropzoneUpload } from "@/components/admin/DropzoneUpload";

type Props = {
  postId?: string;
  initial?: Partial<BlogPostFormValues>;
  initialCoverImageUrl?: string | null;
};

export function BlogPostForm({ postId, initial, initialCoverImageUrl }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cover, setCover] = useState<{ id: string; url: string } | null>(
    initial?.coverMediaId && initialCoverImageUrl ? { id: initial.coverMediaId, url: initialCoverImageUrl } : null
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: { status: "draft", ...initial },
  });

  async function onSubmit(values: BlogPostFormValues) {
    setSubmitting(true);
    setServerError(null);
    const res = await fetch(postId ? `/api/admin/blog/${postId}` : "/api/admin/blog", {
      method: postId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as any;
      setServerError(typeof data?.error === "string" ? data.error : "Please check the form for errors.");
      return;
    }
    router.push("/admin/blog");
    router.refresh();
  }

  async function onDelete() {
    if (!postId) return;
    if (!confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    await fetch(`/api/admin/blog/${postId}`, { method: "DELETE" });
    router.push("/admin/blog");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <div className="space-y-6">
        <section className="border border-hairline bg-white p-5 space-y-4">
          <div>
            <label className="text-sm">Title</label>
            <input {...register("title")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div>
            <label className="text-sm">Slug</label>
            <input {...register("slug")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm font-mono" />
            {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
          </div>
          <div>
            <label className="text-sm">Excerpt</label>
            <textarea {...register("excerpt")} rows={2} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm">Content</label>
            <textarea {...register("content")} rows={16} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm font-mono" />
            <p className="mt-1 text-xs text-muted">
              Plain text/Markdown for now — swap in a rich text editor (e.g. Tiptap) here when ready; it can save to the same `content` column.
            </p>
            {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content.message}</p>}
          </div>
        </section>

        <section className="border border-hairline bg-white p-5 space-y-4">
          <h2 className="text-sm font-medium text-primary-deep">SEO</h2>
          <div>
            <label className="text-sm">SEO title</label>
            <input {...register("seoTitle")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm">SEO description</label>
            <textarea {...register("seoDescription")} rows={3} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
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
            </select>
          </div>
          <div>
            <label className="text-sm">Category</label>
            <input {...register("categoryName")} placeholder="e.g. Craft, Design, Journal" className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm">Tags (comma-separated)</label>
            <input {...register("tags")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
          </div>
        </section>

        <section className="border border-hairline bg-white p-5">
          <h2 className="text-sm font-medium text-primary-deep mb-3">Cover image</h2>
          {cover ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover.url} alt="" className="aspect-[4/3] w-full object-cover border border-hairline" />
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCover(null);
                    setValue("coverMediaId", null);
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
                  setCover(item);
                  setValue("coverMediaId", item.id);
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

        <MediaPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            setCover(item);
            setValue("coverMediaId", item.id);
          }}
        />

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-deep text-bg py-3 text-sm hover:bg-primary transition-colors disabled:opacity-60"
        >
          {submitting ? "Saving…" : postId ? "Save changes" : "Publish post"}
        </button>

        {postId && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="w-full border border-red-300 text-red-600 py-2.5 text-sm hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete post"}
          </button>
        )}
      </aside>
    </form>
  );
}
