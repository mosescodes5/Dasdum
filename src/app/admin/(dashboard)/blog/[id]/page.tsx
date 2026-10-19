"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import type { BlogPostFormValues } from "@/lib/validation/admin-blog";

export default function EditBlogPostPage() {
  const params = useParams<{ id: string }>();
  const [initial, setInitial] = useState<Partial<BlogPostFormValues> | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/blog/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = (await res.json()) as any;
        const p = data.post;
        setCoverImageUrl(p.coverImageUrl ?? null);
        setInitial({
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt ?? "",
          content: p.content ?? "",
          coverMediaId: p.coverMediaId ?? undefined,
          categoryName: p.categoryName ?? "",
          tags: p.tags ? JSON.parse(p.tags).join(", ") : "",
          seoTitle: p.seoTitle ?? "",
          seoDescription: p.seoDescription ?? "",
          status: p.status,
        });
      })
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) {
    return <p className="text-sm text-muted">That post couldn&rsquo;t be found.</p>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-primary-deep">Edit Post</h1>
      {initial ? (
        <BlogPostForm postId={params.id} initial={initial} initialCoverImageUrl={coverImageUrl} />
      ) : (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      )}
    </div>
  );
}
