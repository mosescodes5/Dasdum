"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getLocale } from "@/lib/currency";

type Post = { id: string; title: string; slug: string; status: "draft" | "published"; createdAt: string };

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/blog?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      setPosts(data.posts);
    }
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function bulkDelete(ids: string[]) {
    await fetch("/api/admin/blog", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    load();
  }

  const columns: Column<Post>[] = [
    { key: "title", header: "Title", render: (p) => <Link href={`/admin/blog/${p.id}`} className="font-medium hover:text-primary">{p.title}</Link> },
    { key: "slug", header: "Slug", render: (p) => <span className="text-muted font-mono text-xs">{p.slug}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "date", header: "Created", render: (p) => new Date(p.createdAt).toLocaleDateString(getLocale(), { day: "numeric", month: "short", year: "numeric" }) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary-deep">Blog</h1>
        <Link href="/admin/blog/new" className="flex items-center gap-1.5 bg-primary-deep text-bg px-4 py-2 text-sm hover:bg-primary">
          <Plus size={15} /> New post
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts…" className="border border-hairline px-3 py-2 text-sm flex-1 min-w-[200px]" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-hairline px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={posts ?? []}
          getRowId={(p) => p.id}
          onBulkDelete={bulkDelete}
          emptyMessage={posts === null ? "Loading…" : "No posts yet."}
        />
      </div>
    </div>
  );
}
